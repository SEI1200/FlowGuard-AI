import logging
import os
import uuid
from collections import Counter

from models import (
    SimulationRequest,
    SimulationResponse,
    RiskItem,
    RiskLocation,
    RiskCategory,
    LatLng,
    RiskFactorBreakdown,
    RiskFactorContribution,
    RiskTimeSlot,
    CompositeRisk,
    Bottleneck,
    MitigationTask,
    MitigationImpact,
    MapDangerPoint,
    WeatherCondition,
)
from services.gemini_service import GeminiService
from services.weather_service import fetch_weather_for_event

logger = logging.getLogger(__name__)


def _parse_date_time_range(date_time: str) -> tuple[str, str | None, str | None]:
    if not date_time or not date_time.strip():
        return ("", None, None)
    dt = date_time.strip()
    if "–" in dt or " - " in dt:
        sep = "–" if "–" in dt else " - "
        parts = dt.split(sep, 1)
        left = (parts[0] or "").strip()
        right = (parts[1] if len(parts) > 1 else "").strip()
        date_part = left[:10] if len(left) >= 10 else left
        time_start = left[11:16].strip() if len(left) >= 16 else ("09:00" if len(left) <= 10 else left[11:].strip() or "09:00")
        time_end = right[:5].strip() if len(right) >= 5 else "18:00"
        if len(time_start) != 5:
            time_start = "09:00"
        iso = f"{date_part}T{time_start}:00"
        return (iso, f"{date_part} {time_start}", f"{date_part} {time_end}")
    iso = dt.replace(" ", "T")[:19]
    return (iso, None, None)


CATEGORY_MAP: dict[str, RiskCategory] = {
    "crowd_safety": RiskCategory.CROWD_SAFETY,
    "traffic_logistics": RiskCategory.TRAFFIC_LOGISTICS,
    "environmental_health": RiskCategory.ENVIRONMENTAL_HEALTH,
    "operational": RiskCategory.OPERATIONAL,
    "visibility": RiskCategory.VISIBILITY,
    "legal_compliance": RiskCategory.LEGAL_COMPLIANCE,
}


class RiskEngine:
    def __init__(self) -> None:
        self.gemini = GeminiService()

    async def run_simulation(
        self, request: SimulationRequest
    ) -> SimulationResponse:
        logger.info("Starting simulation for: %s", request.event_name)

        center_lat = sum(p.lat for p in request.polygon) / len(request.polygon)
        center_lng = sum(p.lng for p in request.polygon) / len(request.polygon)

        weather_override = None
        weather_dt, _start, _end = _parse_date_time_range(request.date_time)
        if (
            request.temperature_celsius is None
            or request.precipitation_probability is None
            or request.weather_condition is None
        ):
            temp, precip, cond = await fetch_weather_for_event(
                center_lat,
                center_lng,
                weather_dt or request.date_time,
            )
            weather_override = (temp, precip, cond)
            logger.info("Using fetched weather: %.1f C, %.0f%%, %s", temp, precip, cond.value)

        use_multi_agent = os.environ.get("USE_MULTI_AGENT", "").strip().lower() in ("1", "true", "yes")
        if use_multi_agent:
            raw_result = await self._run_simulation_multi_agent(request, weather_override)
        else:
            raw_result = await self.gemini.analyze_risks(
                request,
                weather_override=weather_override,
            )

        return self._build_simulation_response(
            raw_result, center_lat, center_lng, request, weather_override
        )

    async def _run_simulation_multi_agent(
        self,
        request: SimulationRequest,
        weather_override: tuple[float, float, WeatherCondition] | None,
    ) -> dict:
        """自律型マルチエージェント: 6 カテゴリ並列 + 合成エージェント。"""
        import asyncio

        categories = [c.value for c in RiskCategory]
        tasks = [
            self.gemini.analyze_risks_for_category(
                request, cat, weather_override=weather_override
            )
            for cat in categories
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        merged_risks: list[dict] = []
        for i, r in enumerate(results):
            if isinstance(r, Exception):
                logger.warning("Category agent %s failed: %s", categories[i], r)
                continue
            merged_risks.extend(r.get("risks") or [])

        logger.info("Multi-agent: merged %d risks from %d categories", len(merged_risks), len(categories))

        synthesis = await self.gemini.synthesize_overall(merged_risks, request)
        return {
            "risks": merged_risks,
            "overall_risk_score": synthesis.get("overall_risk_score", 5.0),
            "summary": synthesis.get("summary", "Risk analysis complete."),
            "recommendations": synthesis.get("recommendations", []),
        }

    async def translate_simulation_to_english(self, payload: dict) -> dict:
        return await self.gemini.translate_simulation_to_english(payload)

    def _build_simulation_response(
        self,
        raw_result: dict,
        center_lat: float,
        center_lng: float,
        request: SimulationRequest,
        weather_override: tuple[float, float, any] | None,
    ) -> SimulationResponse:
        risks = self._parse_risks(raw_result.get("risks", []))

        category_counts = Counter(r.category.value for r in risks)
        risk_count_by_category = {
            cat.value: category_counts.get(cat.value, 0)
            for cat in RiskCategory
        }

        overall_score = max(
            0.0,
            min(10.0, float(raw_result.get("overall_risk_score", 5.0))),
        )

        weather_used = None
        if weather_override:
            temp, precip, cond = weather_override
            weather_used = {
                "temperature_celsius": temp,
                "precipitation_probability": precip,
                "weather_condition": cond.value,
            }

        response = SimulationResponse(
            simulation_id=str(uuid.uuid4()),
            event_name=request.event_name,
            event_location=request.event_location,
            date_time=request.date_time,
            risks=risks,
            overall_risk_score=overall_score,
            summary=raw_result.get("summary", "Risk analysis complete."),
            recommendations=raw_result.get("recommendations", []),
            risk_count_by_category=risk_count_by_category,
            traffic_predictions=[],
            weather_used=weather_used,
            locale=request.locale,
        )
        _, time_start, time_end = _parse_date_time_range(request.date_time)
        self._enrich_response(request, risks, response, time_start, time_end)

        logger.info(
            "Simulation complete: id=%s, risks=%d, score=%.1f",
            response.simulation_id,
            len(risks),
            response.overall_risk_score,
        )
        return response

    @staticmethod
    def _ensure_list_str(value: list | str | None) -> list[str]:
        if value is None:
            return []
        if isinstance(value, str):
            return [value] if value.strip() else []
        if isinstance(value, list):
            return [str(x).strip() for x in value if str(x).strip()]
        return []

    @staticmethod
    def _parse_severity(value: str | int | float | None) -> float:
        if value is None:
            return 5.0
        if isinstance(value, (int, float)):
            return max(1.0, min(10.0, float(value)))
        s = str(value).strip().lower()
        severity_map = {
            "高": 8.0, "high": 8.0,
            "中": 5.0, "medium": 5.0, "medium-high": 6.0,
            "低": 2.0, "low": 2.0,
        }
        if s in severity_map:
            return severity_map[s]
        try:
            return max(1.0, min(10.0, float(value)))
        except (TypeError, ValueError):
            return 5.0

    @staticmethod
    def _parse_probability(value: str | int | float | None) -> float:
        if value is None:
            return 0.5
        if isinstance(value, (int, float)):
            return max(0.0, min(1.0, float(value)))
        s = str(value).strip().lower()
        prob_map = {
            "高": 0.8, "high": 0.8,
            "中": 0.5, "medium": 0.5,
            "低": 0.2, "low": 0.2,
        }
        if s in prob_map:
            return prob_map[s]
        try:
            return max(0.0, min(1.0, float(value)))
        except (TypeError, ValueError):
            return 0.5

    def _parse_risks(self, raw_risks: list[dict]) -> list[RiskItem]:
        parsed: list[RiskItem] = []
        for idx, raw in enumerate(raw_risks):
            try:
                category_str = raw.get("category", "operational")
                category = CATEGORY_MAP.get(
                    category_str.lower().strip(),
                    RiskCategory.OPERATIONAL,
                )

                location_data = raw.get("location", {})
                center_data = location_data.get("center", {})

                risk = RiskItem(
                    id=str(uuid.uuid4())[:8],
                    category=category,
                    title=raw.get("title", f"Risk {idx + 1}"),
                    description=raw.get("description", ""),
                    probability=self._parse_probability(raw.get("probability")),
                    severity=self._parse_severity(raw.get("severity")),
                    location=RiskLocation(
                        center=LatLng(
                            lat=float(center_data.get("lat", 0)),
                            lng=float(center_data.get("lng", 0)),
                        ),
                        radius_meters=float(location_data.get("radius_meters", 50)),
                    ),
                    location_description=str(raw.get("location_description", "")).strip(),
                    mitigation_actions=self._ensure_list_str(raw.get("mitigation_actions")),
                    cascading_risks=self._ensure_list_str(raw.get("cascading_risks")),
                    importance=self._parse_optional_score(raw.get("importance"), 5.0),
                    urgency=self._parse_optional_score(raw.get("urgency"), 5.0),
                    execution_difficulty=self._parse_optional_score(raw.get("execution_difficulty"), 5.0),
                    evidence=str(raw.get("evidence", "")).strip() or "",
                )
                parsed.append(risk)

            except Exception as exc:
                logger.warning("Skipping risk item %d: %s", idx, exc)
                continue

        return parsed

    @staticmethod
    def _parse_optional_score(value: str | int | float | None, default: float) -> float | None:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return max(0.0, min(10.0, float(value)))
        try:
            return max(0.0, min(10.0, float(value)))
        except (TypeError, ValueError):
            return None

    def _enrich_response(
        self,
        request: SimulationRequest,
        risks: list[RiskItem],
        response: SimulationResponse,
        time_start: str | None = None,
        time_end: str | None = None,
    ) -> None:
        for r in risks:
            factors = [
                RiskFactorContribution(factor="severity", label="深刻度", weight=r.severity / 10.0, explanation=r.evidence or r.description[:100] if r.description else None),
                RiskFactorContribution(factor="probability", label="発生確率", weight=r.probability, explanation=None),
            ]
            response.risk_factor_breakdowns.append(
                RiskFactorBreakdown(risk_id=r.id, factors=factors)
            )

        if risks:
            if time_start and time_end:
                from datetime import datetime, timedelta
                try:
                    start_dt = datetime.strptime(time_start, "%Y-%m-%d %H:%M")
                    end_dt = datetime.strptime(time_end, "%Y-%m-%d %H:%M")
                    if end_dt <= start_dt:
                        end_dt = end_dt + timedelta(days=1)
                    slot_start = start_dt
                    slots_built: list[tuple[datetime, datetime]] = []
                    while slot_start < end_dt:
                        slot_end = min(slot_start + timedelta(hours=1), end_dt)
                        slots_built.append((slot_start, slot_end))
                        slot_start = slot_end
                    base_score = response.overall_risk_score
                    n_slots = len(slots_built)
                    for i, (st, en) in enumerate(slots_built):
                        if n_slots <= 1:
                            mult = 1.0
                        elif n_slots <= 3:
                            mult = 1.0 + (0.2 if i == 0 else 0.15 if i == n_slots - 1 else 0)
                        else:
                            t = i / max(1, n_slots - 1)
                            if t < 0.2:
                                mult = 1.0 + 0.25 * (1 - t / 0.2)
                            elif t > 0.8:
                                mult = 1.0 + 0.2 * ((t - 0.8) / 0.2)
                            else:
                                mult = 0.85 + 0.15 * (t - 0.2) / 0.6
                        score = max(1.0, min(10.0, round(base_score * mult, 1)))
                        response.risk_time_series.append(
                            RiskTimeSlot(
                                start_time=st.strftime("%Y-%m-%dT%H:%M:%S"),
                                end_time=en.strftime("%Y-%m-%dT%H:%M:%S"),
                                risk_score=score,
                                risk_ids=[r.id for r in risks[:5]],
                                label=st.strftime("%H:%M") + "–" + en.strftime("%H:%M"),
                            )
                        )
                except (ValueError, TypeError):
                    response.risk_time_series.append(
                        RiskTimeSlot(
                            start_time=time_start,
                            end_time=time_end,
                            risk_score=response.overall_risk_score,
                            risk_ids=[r.id for r in risks[:5]],
                            label="開催時間帯",
                        )
                    )
            else:
                dt = request.date_time[:19] if len(request.date_time) >= 19 else request.date_time
                response.risk_time_series.append(
                    RiskTimeSlot(
                        start_time=dt,
                        end_time=dt,
                        risk_score=response.overall_risk_score,
                        risk_ids=[r.id for r in risks[:5]],
                        label="メイン時間帯",
                    )
                )

        for r in risks:
            if r.severity >= 7 and r.location_description:
                response.bottlenecks.append(
                    Bottleneck(
                        location_description=r.location_description,
                        center=r.location.center,
                        radius_meters=r.location.radius_meters,
                        reason=r.title,
                        severity=r.severity,
                        suggested_measures=r.mitigation_actions[:3],
                    )
                )

        for r in risks:
            for i, action in enumerate(r.mitigation_actions):
                task = MitigationTask(
                    risk_id=r.id,
                    who="担当者",
                    action=action,
                    due_by=(time_start[:10] if time_start else request.date_time[:10]) if (time_start or request.date_time) else None,
                    required_items=[],
                    impact_score=r.severity,
                    category="general",
                    checked=False,
                )
                response.mitigation_tasks.append(task)
                impact_per_task = max(0.08, min(0.35, (r.severity or 5) / 40.0))
                response.mitigation_impacts.append(
                    MitigationImpact(
                        mitigation_id=task.id,
                        risk_score_delta=-round(impact_per_task, 2),
                        danger_count_delta=-1 if i == 0 else 0,
                        congestion_time_delta_minutes=-5.0 if i == 0 else -2.0,
                        indicators_improved=["リスク低減"],
                    )
                )

        reason_map = {
            RiskCategory.VISIBILITY: "blind_spot",
            RiskCategory.CROWD_SAFETY: "narrow",
            RiskCategory.ENVIRONMENTAL_HEALTH: "slope",
        }
        for r in risks:
            response.danger_points.append(
                MapDangerPoint(
                    center=r.location.center,
                    reason=reason_map.get(r.category, "other"),
                    label=r.title[:30] if r.title else r.location_description or "リスク",
                    risk_id=r.id,
                )
            )
