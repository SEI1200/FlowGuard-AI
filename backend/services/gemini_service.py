import asyncio
import json
import logging
import os
import re

from google import genai
from google.genai import types

from models import (
    SimulationRequest,
    EventType,
    AudienceType,
    WeatherCondition,
)

logger = logging.getLogger(__name__)

EVENT_TYPE_LABELS: dict[EventType, str] = {
    EventType.MUSIC_FESTIVAL: "Music Festival / Concert",
    EventType.FIREWORKS: "Fireworks Display",
    EventType.MARATHON: "Marathon / Running Event",
    EventType.DEMONSTRATION: "Demonstration / Protest March",
    EventType.SPORTS_EVENT: "Sports Event",
    EventType.EXHIBITION: "Exhibition / Convention",
    EventType.OTHER: "Other",
}

AUDIENCE_TYPE_LABELS: dict[AudienceType, str] = {
    AudienceType.YOUTH: "Primarily young adults (18-30)",
    AudienceType.FAMILY: "Family-oriented (children and parents)",
    AudienceType.ELDERLY: "Primarily elderly (65+)",
    AudienceType.MIXED: "Mixed demographics",
}

WEATHER_LABELS: dict[WeatherCondition, str] = {
    WeatherCondition.CLEAR: "Clear sky",
    WeatherCondition.CLOUDY: "Cloudy",
    WeatherCondition.RAIN: "Light to moderate rain",
    WeatherCondition.HEAVY_RAIN: "Heavy rain",
    WeatherCondition.STORM: "Storm / Thunderstorm",
    WeatherCondition.SNOW: "Snow",
    WeatherCondition.EXTREME_HEAT: "Extreme heat",
}

SYSTEM_PROMPT = """\
You are the Chief Risk Officer (CRO) for large-scale event management.
You have decades of experience analysing and mitigating risks at major
public events worldwide, including music festivals, fireworks displays,
marathons, demonstrations, and sports events.

Your task is to analyse the given event parameters and geographic area to
produce a comprehensive, multi-layered risk assessment.

RISK CATEGORIES (you must consider ALL six):
1. crowd_safety     - Crowd crush, stampede, congestion, bottlenecks, surges.
2. traffic_logistics - Road congestion, illegal parking, vehicle-pedestrian
                       conflicts, public transit overload, delivery vehicles.
3. environmental_health - Heatstroke risk (shade / hydration), sudden weather
                          changes, evacuation route adequacy, air quality.
4. operational       - Long entry queues, insufficient restrooms, waste
                       management, noise complaints, communication failures.
5. visibility        - HEIGHT and BLIND SPOT risks: poor line-of-sight from
                       staff or cameras, areas hidden by structures or terrain,
                       stage/view obstructions, multi-level visibility gaps,
                       corners and elevated areas that are hard to monitor.
                       Simulate "where can staff/cameras see?" and flag blind spots.
6. legal_compliance  - LEGAL and REGULATORY obligations for event hosting.
                       Include risks related to: road use permits (police /
                       Road Traffic Act), food business notifications (health
                       center), fire department notifications (Fire Service Act),
                       entertainment business regulations (e.g. 風営法 where
                       applicable), copyright and music licensing, noise
                       ordinances, temporary structures permits, and any
                       other permits or filings required by venue type and
                       event content. Flag missing or late filings and
                       location-specific obligations (e.g. near roads, food
                       stalls, stages using copyrighted material).

ANALYSIS REQUIREMENTS:
- Analyse geographic features (intersections, plazas, narrow alleys, slopes,
  waterfront areas) combined with event characteristics.
- Consider CASCADING RISKS: how one risk can trigger another.
  Example: sudden rain causes crowd rush to covered areas, creating crush risk.
- Provide SPECIFIC LOCATIONS within the polygon for each risk using
  latitude / longitude coordinates.
- Be imaginative yet realistic. Consider time-of-day effects, crowd
  psychology, and infrastructure limitations.
- Each risk must include concrete, actionable mitigation strategies.

LOCATION DESCRIPTION (required for every risk):
- For each risk, set "location_description" to a short, concrete text that tells readers WHERE this risk applies (e.g. "メインステージ正面の混雑エリア", "東入口付近の歩道", "〇〇交差点北側", "会場西側の避難経路"). Use place names, landmarks, and directions so anyone can understand the location without a map.
- For traffic_logistics: use concrete place names (intersections, roads, station exits) that readers can look up on Google Maps.

OUTPUT FORMAT - respond with VALID JSON. Schema:
{
  "risks": [
    {
      "category": "crowd_safety" | "traffic_logistics" | "environmental_health" | "operational" | "visibility" | "legal_compliance",
      "title": "string",
      "description": "string",
      "location_description": "string (REQUIRED: concrete place description for readers, e.g. 'メインステージ正面の混雑エリア', '東入口付近の歩道', '〇〇交差点北側')",
      "probability": <number 0.0 to 1.0>,
      "severity": <number 1.0 to 10.0>,
      "location": { "center": { "lat": <number>, "lng": <number> }, "radius_meters": <number> },
      "mitigation_actions": [ "string", ... ],
      "cascading_risks": [ "string", ... ]
    }
  ],
  "overall_risk_score": <number 1.0 to 10.0>,
  "summary": "string",
  "recommendations": [ "string", ... ]
}

CRITICAL - PLAIN TEXT ONLY (NO MARKDOWN):
- Do NOT use markdown or formatting characters in any text field. No asterisks (e.g. ** for bold), no underscores (__), no markdown syntax. summary, recommendations, title, description, mitigation_actions, and all other string fields must be plain text only.

CRITICAL - NUMERIC FIELDS ONLY:
- probability: MUST be a number between 0.0 and 1.0 (e.g. 0.7, 0.35). Never use text like "High", "Medium", "Low", "高", "中", "低".
- severity: MUST be a number between 1.0 and 10.0 (e.g. 7.5, 4.0). Never use text labels; use numeric values only.
- cascading_risks: MUST be an array of strings (e.g. ["risk A", "risk B"]). If a single description, use one-element array.

Generate between 10 and 20 risk items, ensuring coverage across ALL six categories (include at least 1–2 visibility risks and at least 1–2 legal_compliance risks where relevant to the event type and location).
Make locations realistic and within or near the specified polygon area.
Probability should reflect real-world likelihood for this type and scale of event (as a number 0.0–1.0).
Severity should reflect potential impact on human safety and event operations (as a number 1.0–10.0).\
"""

LOCALE_SUFFIX = {
    "ja": (
        "\n\nLANGUAGE REQUIREMENT:\n"
        "Respond entirely in Japanese. ALL text fields (title, description, "
        "mitigation_actions, cascading_risks, summary, recommendations) "
        "MUST be written in Japanese. JSON keys remain in English."
    ),
    "en": (
        "\n\nLANGUAGE REQUIREMENT:\n"
        "Respond entirely in English. ALL text fields (title, description, "
        "mitigation_actions, cascading_risks, summary, recommendations) "
        "MUST be written in English. JSON keys remain in English."
    ),
}


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def _format_date_time_for_prompt(date_time: str) -> str:
    if not date_time or not date_time.strip():
        return "Not specified."
    dt = date_time.strip()
    if "–" in dt or " - " in dt:
        sep = "–" if "–" in dt else " - "
        parts = dt.split(sep, 1)
        left = (parts[0] or "").strip()
        right = (parts[1] if len(parts) > 1 else "").strip()
        date_part = left[:10] if len(left) >= 10 else left
        time_start = left[11:16] if len(left) >= 16 else (left[11:] if len(left) > 10 else "09:00")
        time_end = right[:5] if len(right) >= 5 else (right[:5] if right else "18:00")
        return f"Event date: {date_part}. Time range: {time_start} to {time_end} (consider how risks vary by time: opening rush, midday peak, closing, etc.)."
    return f"Date / Time: {dt[:19] if len(dt) >= 19 else dt}"


def build_analysis_prompt(
    request: SimulationRequest,
    weather_override: tuple[float, float, WeatherCondition] | None = None,
) -> str:
    polygon_str = ", ".join(
        f"({p.lat:.6f}, {p.lng:.6f})" for p in request.polygon
    )
    center_lat = sum(p.lat for p in request.polygon) / len(request.polygon)
    center_lng = sum(p.lng for p in request.polygon) / len(request.polygon)
    date_time_line = _format_date_time_for_prompt(request.date_time)

    if weather_override:
        temp, precip, cond = weather_override
        weather_block = f"""\
WEATHER CONDITIONS (fetched for event date/location):
- Temperature: {temp} deg C
- Precipitation Probability: {precip}%
- Condition: {WEATHER_LABELS.get(cond, cond.value)}"""
    elif (
        request.temperature_celsius is not None
        and request.precipitation_probability is not None
        and request.weather_condition is not None
    ):
        weather_block = f"""\
WEATHER CONDITIONS:
- Temperature: {request.temperature_celsius} deg C
- Precipitation Probability: {request.precipitation_probability}%
- Condition: {WEATHER_LABELS.get(request.weather_condition, request.weather_condition.value)}"""
    else:
        weather_block = "WEATHER CONDITIONS: Not specified (will be fetched for event date)."

    locale_instruction = LOCALE_SUFFIX.get(request.locale, "")

    return f"""\
Analyse the following event and produce a comprehensive risk assessment.

EVENT DETAILS:
- Event Name: {request.event_name}
- Event Type: {EVENT_TYPE_LABELS.get(request.event_type, request.event_type.value)}
- Event Location / Venue: {request.event_location}
- {date_time_line}
- Expected Attendance: {request.expected_attendance:,} people
- Primary Audience: {AUDIENCE_TYPE_LABELS.get(request.audience_type, request.audience_type.value)}

{weather_block}

GEOGRAPHIC AREA:
- Polygon vertices: [{polygon_str}]
- Approximate centre: ({center_lat:.6f}, {center_lng:.6f})

ADDITIONAL NOTES FROM ORGANISER:
{request.additional_notes if request.additional_notes else "None provided."}

Provide your risk assessment as JSON.
Ensure all risk locations fall within or very near the polygon area.\
{locale_instruction}"""


class GeminiService:
    def __init__(self) -> None:
        self._project_id = os.getenv("PROJECT_ID", "flowguard-hackathon-2026")
        self._model_id = os.getenv("MODEL_ID", "gemini-3-pro-preview")
        if "gemini-3-pro" in self._model_id:
            self._location = "global"
        else:
            self._location = os.getenv("LOCATION", "us-central1")

        self._client = genai.Client(
            vertexai=True,
            project=self._project_id,
            location=self._location,
        )

        temperature = 1.0 if "gemini-3-pro" in self._model_id else 0.7
        thinking_config = (
            types.ThinkingConfig(thinking_level=types.ThinkingLevel.HIGH)
            if "gemini-3-pro" in self._model_id
            else None
        )
        self._config = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=temperature,
            top_p=0.9,
            max_output_tokens=16384,
            response_mime_type="application/json",
            thinking_config=thinking_config,
        )

        logger.info(
            "GeminiService initialised (project=%s, location=%s, model=%s)",
            self._project_id,
            self._location,
            self._model_id,
        )

    async def analyze_risks(
        self,
        request: SimulationRequest,
        max_retries: int = 3,
        weather_override: tuple[float, float, "WeatherCondition"] | None = None,
    ) -> dict:
        prompt = build_analysis_prompt(request, weather_override)
        logger.info("Sending analysis request for event: %s", request.event_name)

        last_error: Exception | None = None

        for attempt in range(1, max_retries + 1):
            try:
                response = await self._client.aio.models.generate_content(
                    model=self._model_id,
                    contents=prompt,
                    config=self._config,
                )
                raw_text = response.text or ""

                try:
                    result = json.loads(raw_text)
                except json.JSONDecodeError:
                    logger.warning(
                        "Attempt %d: raw JSON invalid, trying repair...",
                        attempt,
                    )
                    result = _repair_json(raw_text)

                logger.info(
                    "Received analysis with %d risk items (attempt %d)",
                    len(result.get("risks", [])),
                    attempt,
                )
                return result

            except json.JSONDecodeError as exc:
                last_error = exc
                logger.warning(
                    "Attempt %d/%d: JSON parse failed after repair: %s",
                    attempt,
                    max_retries,
                    exc,
                )

            except Exception as exc:
                last_error = exc
                exc_str = str(exc)

                is_retryable = "429" in exc_str or "500" in exc_str or "503" in exc_str

                if is_retryable and attempt < max_retries:
                    wait = 2 ** attempt
                    logger.warning(
                        "Attempt %d/%d failed (retryable): %s  "
                        "-- waiting %ds before retry",
                        attempt,
                        max_retries,
                        exc_str[:120],
                        wait,
                    )
                    await asyncio.sleep(wait)
                    continue

                logger.error("Gemini API call failed: %s", exc_str[:200])
                raise

        raise ValueError(
            f"AI response was not valid JSON after {max_retries} attempts: "
            f"{last_error}"
        )

    async def _translate_chunk(self, chunk: dict) -> dict:
        import json as _json
        prompt = (
            "Translate the following JSON from Japanese to English.\n"
            "Rules: Preserve exact structure and keys. Translate only string values (user-visible text). "
            "Do NOT translate keys, enum values (e.g. crowd_safety), numbers, or IDs. "
            "Return valid JSON only, no markdown.\n\n"
            + _json.dumps(chunk, ensure_ascii=False, indent=0)
        )
        response = await self._client.aio.models.generate_content(
            model=self._model_id,
            contents=prompt,
            config=self._config,
        )
        raw_text = (response.text or "").strip()
        if raw_text.startswith("```"):
            raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
            raw_text = re.sub(r"\s*```\s*$", "", raw_text)
        try:
            return _json.loads(raw_text)
        except _json.JSONDecodeError as e:
            logger.warning("Translate chunk not valid JSON: %s", e)
            raise ValueError("Translation chunk response was not valid JSON.") from e

    async def translate_simulation_to_english(self, payload: dict) -> dict:
        import copy as _copy
        import json as _json

        result = _copy.deepcopy(payload)
        risks = result.get("risks") or []
        batch_size = 5

        head = {
            "event_name": payload.get("event_name", ""),
            "event_location": payload.get("event_location") or "",
            "date_time": payload.get("date_time") or "",
            "summary": payload.get("summary", ""),
            "recommendations": payload.get("recommendations") or [],
        }
        translated_head = await self._translate_chunk(head)
        result["event_name"] = translated_head.get("event_name", result["event_name"])
        result["event_location"] = translated_head.get("event_location", result.get("event_location"))
        result["date_time"] = translated_head.get("date_time", result.get("date_time"))
        result["summary"] = translated_head.get("summary", result.get("summary"))
        result["recommendations"] = translated_head.get("recommendations", result.get("recommendations"))

        for i in range(0, len(risks), batch_size):
            batch = risks[i : i + batch_size]
            translated_batch = await self._translate_chunk({"risks": batch})
            out_risks = translated_batch.get("risks") or []
            for j, tr in enumerate(out_risks):
                idx = i + j
                if idx < len(result["risks"]) and isinstance(tr, dict):
                    for key in ("title", "description", "location_description", "evidence"):
                        if key in tr:
                            result["risks"][idx][key] = tr[key]
                    for key in ("mitigation_actions", "cascading_risks"):
                        if key in tr and isinstance(tr[key], list):
                            result["risks"][idx][key] = tr[key]

        import asyncio

        tasks = payload.get("mitigation_tasks") or []
        composite = payload.get("composite_risks") or []
        bottlenecks = payload.get("bottlenecks") or []
        series = payload.get("risk_time_series") or []

        async def translate_tasks_chunk() -> list:
            if not tasks:
                return []
            tr = await self._translate_chunk({"mitigation_tasks": tasks})
            return tr.get("mitigation_tasks") or []

        async def translate_composite_chunk() -> list:
            if not composite:
                return []
            tr = await self._translate_chunk({"composite_risks": composite})
            return tr.get("composite_risks") or []

        async def translate_bottlenecks_chunk() -> list:
            if not bottlenecks:
                return []
            tr = await self._translate_chunk({"bottlenecks": bottlenecks})
            return tr.get("bottlenecks") or []

        async def translate_series_chunk() -> list:
            if not series:
                return []
            tr = await self._translate_chunk({"risk_time_series": [{"label": s.get("label")} for s in series]})
            return tr.get("risk_time_series") or []

        out_tasks, out_c, out_b, out_s = await asyncio.gather(
            translate_tasks_chunk(),
            translate_composite_chunk(),
            translate_bottlenecks_chunk(),
            translate_series_chunk(),
        )

        for j, tr in enumerate(out_tasks):
            if j < len(result.get("mitigation_tasks") or []) and isinstance(tr, dict):
                for key in ("who", "action"):
                    if key in tr:
                        result["mitigation_tasks"][j][key] = tr[key]
                if "required_items" in tr and isinstance(tr["required_items"], list):
                    result["mitigation_tasks"][j]["required_items"] = tr["required_items"]

        for j, tr in enumerate(out_c):
            if j < len(result.get("composite_risks") or []) and isinstance(tr, dict):
                for key in ("title", "description", "conditions"):
                    if key in tr and (key != "conditions" or isinstance(tr[key], list)):
                        result["composite_risks"][j][key] = tr[key]

        for j, tr in enumerate(out_b):
            if j < len(result.get("bottlenecks") or []) and isinstance(tr, dict):
                for key in ("location_description", "reason", "suggested_measures"):
                    if key in tr:
                        result["bottlenecks"][j][key] = tr[key]

        for j, tr in enumerate(out_s):
            if j < len(result.get("risk_time_series") or []) and isinstance(tr, dict) and "label" in tr:
                result["risk_time_series"][j]["label"] = tr["label"]

        logger.info("Translated simulation response to English (chunked, parallel).")
        return result


def _repair_json(raw: str) -> dict:
    text = raw.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    base = text
    base = re.sub(r",\s*$", "", base)

    quote_count = base.count('"') - base.count('\\"')
    if quote_count % 2 != 0:
        base += '"'

    stack: list[str] = []
    in_string = False
    escape = False
    for ch in base:
        if escape:
            escape = False
            continue
        if ch == "\\":
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch in ("{", "["):
            stack.append("}" if ch == "{" else "]")
        elif ch in ("}", "]"):
            if stack and stack[-1] == ch:
                stack.pop()

    suffix_base = re.sub(r",\s*$", "", base)
    closing = "".join(reversed(stack))
    candidate = suffix_base + closing
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        pass

    match = None
    for m in re.finditer(r"\}\s*,", text):
        match = m
    if match:
        truncated = text[: match.end() - 1]
        for suffix in [
            ']},"overall_risk_score":5,"summary":"Analysis truncated.","recommendations":[]}',
            "]}",
            "]}}}",
        ]:
            try:
                return json.loads(truncated + suffix)
            except json.JSONDecodeError:
                continue

    json.loads(text)
    return {}  # unreachable but satisfies type checker
