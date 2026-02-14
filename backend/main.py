import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from pydantic import ValidationError as PydanticValidationError
from models import SimulationRequest, SimulationResponse, LatLng
from services.risk_engine import RiskEngine
from services.assist_engine import AssistEngine
from services.pdf_report import build_pdf
from services.roads_service import snap_path_to_map_boundaries
from pydantic import BaseModel, Field
from typing import Any

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

risk_engine: RiskEngine | None = None
assist_engine: AssistEngine | None = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global risk_engine, assist_engine
    risk_engine = RiskEngine()
    assist_engine = AssistEngine()
    logger.info("FlowGuard AI backend started.")
    yield
    logger.info("FlowGuard AI backend shutting down.")


app = FastAPI(
    title="FlowGuard AI",
    description="Comprehensive Event Risk Simulation API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "flowguard-ai"}


@app.get("/api/config")
async def get_config():
    return {
        "google_maps_api_key": os.getenv("GOOGLE_MAPS_API_KEY", ""),
    }


@app.post("/api/area/snap-to-roads")
async def snap_to_boundaries(body: dict):
    path_data = body.get("path") or []
    if not isinstance(path_data, list) or len(path_data) < 3:
        raise HTTPException(
            status_code=422,
            detail="path must be an array of at least 3 { lat, lng } objects.",
        )
    try:
        path = [LatLng(lat=float(p["lat"]), lng=float(p["lng"])) for p in path_data]
    except (KeyError, TypeError, ValueError) as e:
        raise HTTPException(status_code=422, detail=f"Invalid path format: {e}")
    snapped = await snap_path_to_map_boundaries(path)
    return {"path": [{"lat": p.lat, "lng": p.lng} for p in snapped]}


@app.post("/api/simulate", response_model=SimulationResponse)
async def simulate(request: SimulationRequest):
    if risk_engine is None:
        raise HTTPException(status_code=503, detail="Service not ready")

    try:
        result = await risk_engine.run_simulation(request)
        return result
    except ValueError as exc:
        logger.error("Validation error during simulation: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        exc_str = str(exc)
        logger.error("Simulation failed: %s", exc_str[:300])

        if "429" in exc_str:
            raise HTTPException(
                status_code=429,
                detail="API rate limit exceeded. Please wait a moment and try again.",
            )
        raise HTTPException(
            status_code=500,
            detail="Simulation failed. Please try again.",
        )


SCENARIO_TEMPLATES = [
    {
        "id": "music_festival",
        "name": "音楽フェスティバル",
        "event_type": "music_festival",
        "preset": {
            "event_name": "サマーフェス 2026",
            "event_location": "幕張海浜公園, 千葉県",
            "expected_attendance": 28000,
            "additional_notes": "野外ステージ2基、飲食エリアあり",
        },
    },
    {
        "id": "fireworks",
        "name": "花火大会",
        "event_type": "fireworks",
        "preset": {
            "event_name": "納涼花火大会",
            "event_location": "隅田川河川敷, 東京都墨田区",
            "expected_attendance": 25000,
            "additional_notes": "打ち上げ約5000発、有料席あり",
        },
    },
    {
        "id": "exhibition",
        "name": "展示会",
        "event_type": "exhibition",
        "preset": {
            "event_name": "産業展示会",
            "event_location": "東京ビッグサイト, 東京都江東区",
            "expected_attendance": 50000,
            "additional_notes": "BtoB、搬入搬出車両多",
        },
    },
    {
        "id": "school_festival",
        "name": "学園祭",
        "event_type": "other",
        "preset": {
            "event_name": "〇〇大学祭",
            "event_location": "東京大学本郷キャンパス, 東京都文京区",
            "expected_attendance": 5000,
            "additional_notes": "屋台・ステージ・展示",
        },
    },
]


class ValidateInputBody(BaseModel):
    event_name: str = Field("", max_length=200)
    event_location: str = Field("", max_length=500)
    date_time: str = ""
    expected_attendance: int = Field(0, ge=0, le=10_000_000)


@app.get("/api/templates")
async def get_templates():
    return {"templates": SCENARIO_TEMPLATES}


@app.post("/api/validate")
async def validate_input(body: ValidateInputBody):
    issues = []
    if not (body.event_name or "").strip():
        issues.append({"field": "event_name", "code": "required", "message": "イベント名は必須です。", "severity": "error"})
    if not (body.event_location or "").strip():
        issues.append({"field": "event_location", "code": "required", "message": "開催場所は必須です。", "severity": "error"})
    if not (body.date_time or "").strip():
        issues.append({"field": "date_time", "code": "required", "message": "開催日時は必須です。", "severity": "error"})
    if body.expected_attendance <= 0:
        issues.append({"field": "expected_attendance", "code": "min", "message": "予想来場者数は1以上を入力してください。", "severity": "error"})
    if body.expected_attendance > 500000 and not issues:
        issues.append({"field": "expected_attendance", "code": "warning", "message": "50万人超のイベントは要確認です。", "severity": "warning"})
    return {"valid": len([i for i in issues if i["severity"] == "error"]) == 0, "issues": issues}


class AssistRequestBody(BaseModel):
    question: str = Field("", max_length=2000)


@app.post("/api/assist")
async def assist(body: AssistRequestBody):
    if assist_engine is None:
        raise HTTPException(status_code=503, detail="Service not ready.")
    try:
        answer = await assist_engine.answer(body.question)
        return {"answer": answer}
    except Exception as exc:
        logger.exception("Assist failed: %s", exc)
        raise HTTPException(status_code=500, detail="Assistant failed. Please try again.")


@app.post("/api/translate-simulation")
async def translate_simulation(body: dict):
    if risk_engine is None:
        raise HTTPException(status_code=503, detail="Service not ready")
    try:
        translated = await risk_engine.translate_simulation_to_english(body)
        return translated
    except Exception as exc:
        logger.error("Translate simulation failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Translation failed. Please try again.",
        )


@app.post("/api/report/pdf")
async def export_report_pdf(
    body: dict[str, Any],
    variant: str | None = None,
):
    try:
        delta_summary = body.get("delta_summary") if isinstance(body, dict) else None
        site_check_memos = body.get("site_check_memos") if isinstance(body, dict) else None
        todo_checks = body.get("todo_checks") if isinstance(body, dict) else None
        adopted_todos = body.get("adopted_todos") if isinstance(body, dict) else None
        pins = body.get("pins") if isinstance(body, dict) else None
        payload_dict = {
            k: v
            for k, v in (body or {}).items()
            if k not in ("delta_summary", "site_check_memos", "todo_checks", "adopted_todos", "pins")
        }
        payload = SimulationResponse.model_validate(payload_dict)
        sim_id = getattr(payload, "simulation_id", None) or ""
        if not sim_id:
            raise HTTPException(status_code=400, detail="simulation_id is required for PDF report.")
        pdf_bytes = build_pdf(
            payload,
            variant=(variant or "full"),
            delta_summary=delta_summary,
            site_check_memos=site_check_memos,
            todo_checks=todo_checks,
            adopted_todos=adopted_todos,
            pins=pins,
        )
        suffix = "_1page" if (variant or "").strip().lower() == "one_page" else ""
        filename = f"FlowGuard_Report_{sim_id[:8]}{suffix}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            },
        )
    except PydanticValidationError as exc:
        logger.warning("PDF report payload validation error: %s", exc)
        raise HTTPException(status_code=400, detail=exc.errors()[0].get("msg", str(exc)) if exc.errors() else str(exc))
    except ValueError as exc:
        logger.warning("PDF report validation error: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("PDF generation failed: %s", exc)
        detail = "Report generation failed."
        msg = str(exc).strip()
        if msg and len(msg) < 200:
            detail = f"{detail} ({msg})"
        raise HTTPException(status_code=500, detail=detail)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
