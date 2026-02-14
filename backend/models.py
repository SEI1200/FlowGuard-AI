import uuid
from enum import Enum

from pydantic import BaseModel, Field


class RiskCategory(str, Enum):
    CROWD_SAFETY = "crowd_safety"
    TRAFFIC_LOGISTICS = "traffic_logistics"
    ENVIRONMENTAL_HEALTH = "environmental_health"
    OPERATIONAL = "operational"
    VISIBILITY = "visibility"
    LEGAL_COMPLIANCE = "legal_compliance"


class EventType(str, Enum):
    MUSIC_FESTIVAL = "music_festival"
    FIREWORKS = "fireworks"
    MARATHON = "marathon"
    DEMONSTRATION = "demonstration"
    SPORTS_EVENT = "sports_event"
    EXHIBITION = "exhibition"
    OTHER = "other"


class AudienceType(str, Enum):
    YOUTH = "youth"
    FAMILY = "family"
    ELDERLY = "elderly"
    MIXED = "mixed"


class WeatherCondition(str, Enum):
    CLEAR = "clear"
    CLOUDY = "cloudy"
    RAIN = "rain"
    HEAVY_RAIN = "heavy_rain"
    STORM = "storm"
    SNOW = "snow"
    EXTREME_HEAT = "extreme_heat"


class UserRole(str, Enum):
    ORGANIZER = "organizer"
    SECURITY = "security"
    LOCAL_GOV = "local_gov"
    VENUE_MANAGER = "venue_manager"


class AlertThreshold(str, Enum):
    CONSERVATIVE = "conservative"
    STANDARD = "standard"
    AGGRESSIVE = "aggressive"


class LatLng(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class SimulationRequest(BaseModel):
    event_name: str = Field(..., min_length=1, max_length=200)
    event_type: EventType
    event_location: str = Field(..., min_length=1, max_length=500)
    date_time: str = Field(..., description="ISO 8601 format datetime string")
    expected_attendance: int = Field(..., ge=1, le=10_000_000)
    audience_type: AudienceType
    temperature_celsius: float | None = Field(None, ge=-40, le=55)
    precipitation_probability: float | None = Field(None, ge=0, le=100)
    weather_condition: WeatherCondition | None = None
    polygon: list[LatLng] = Field(..., min_length=3)
    additional_notes: str = Field(default="", max_length=2000)
    locale: str = Field(default="ja", pattern=r"^(ja|en)$")
    role: UserRole | None = Field(None, description="Viewpoint role for output tailoring")
    alert_threshold: AlertThreshold | None = Field(None, description="Alert sensitivity")


class RiskLocation(BaseModel):
    center: LatLng
    radius_meters: float = Field(..., ge=0)


class RiskItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    category: RiskCategory
    title: str
    description: str
    probability: float = Field(..., ge=0, le=1, description="0.0 to 1.0")
    severity: float = Field(..., ge=1, le=10, description="1 to 10 scale")
    location: RiskLocation
    location_description: str = Field(default="", description="Human-readable place description (e.g. メインステージ正面)")
    mitigation_actions: list[str]
    cascading_risks: list[str] = Field(default_factory=list)
    importance: float | None = Field(None, ge=0, le=10)
    urgency: float | None = Field(None, ge=0, le=10)
    execution_difficulty: float | None = Field(None, ge=0, le=10)
    evidence: str = Field(default="", description="Root cause / which inputs drove this risk")


class TrafficPrediction(BaseModel):
    road_name: str
    coordinates: list[LatLng] = Field(..., min_length=2)
    congestion_level: float = Field(..., ge=0, le=1, description="0=free, 1=severe")


class RiskFactorContribution(BaseModel):
    factor: str = Field(..., description="e.g. congestion, weather, terrain")
    label: str = ""
    weight: float = Field(..., ge=0, le=1)
    explanation: str | None = None


class RiskFactorBreakdown(BaseModel):
    risk_id: str
    factors: list[RiskFactorContribution] = Field(default_factory=list)


class RiskTimeSlot(BaseModel):
    start_time: str = ""
    end_time: str = ""
    risk_score: float = Field(0, ge=0, le=10)
    risk_ids: list[str] = Field(default_factory=list)
    label: str | None = None


class CompositeRisk(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    title: str = ""
    description: str = ""
    conditions: list[str] = Field(default_factory=list)
    risk_ids: list[str] = Field(default_factory=list)
    severity: float = Field(5, ge=0, le=10)
    probability: float = Field(0.5, ge=0, le=1)


class Bottleneck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    location_description: str = ""
    center: LatLng = Field(default_factory=lambda: LatLng(lat=0, lng=0))
    radius_meters: float = Field(50, ge=0)
    reason: str = ""
    severity: float = Field(5, ge=0, le=10)
    suggested_measures: list[str] = Field(default_factory=list)


class MitigationTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    risk_id: str | None = None
    who: str = ""
    action: str = ""
    due_by: str | None = None
    required_items: list[str] = Field(default_factory=list)
    estimated_effort_hours: float | None = None
    impact_score: float | None = None
    execution_cost_level: str | None = None
    duration_minutes: float | None = None
    dependencies: list[str] = Field(default_factory=list)
    category: str | None = None
    checked: bool = False


class MapDangerPoint(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    center: LatLng = Field(default_factory=lambda: LatLng(lat=0, lng=0))
    reason: str = Field(..., description="e.g. blind_spot, narrow, slope")
    label: str = ""
    risk_id: str | None = None


class MapRouteSegment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    type: str = Field(..., description="recommended | restriction | one_way")
    path: list[LatLng] = Field(default_factory=list)
    label: str | None = None


class ChangeHistoryEntry(BaseModel):
    at: str = ""
    change_type: str = ""
    description: str = ""
    risk_before: float | None = None
    risk_after: float | None = None


class MitigationImpact(BaseModel):
    mitigation_id: str = ""
    risk_score_delta: float = 0
    danger_count_delta: int | None = None
    congestion_time_delta_minutes: float | None = None
    indicators_improved: list[str] = Field(default_factory=list)


class SimulationResponse(BaseModel):
    simulation_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_name: str
    event_location: str = ""
    date_time: str = ""
    risks: list[RiskItem]
    overall_risk_score: float = Field(..., ge=0, le=10)
    summary: str
    recommendations: list[str]
    risk_count_by_category: dict[str, int]
    traffic_predictions: list[TrafficPrediction] = Field(default_factory=list)
    weather_used: dict | None = Field(None, description="Fetched weather used for analysis")
    locale: str = Field(default="ja", pattern=r"^(ja|en)$")
    risk_factor_breakdowns: list[RiskFactorBreakdown] = Field(default_factory=list)
    risk_time_series: list[RiskTimeSlot] = Field(default_factory=list)
    composite_risks: list[CompositeRisk] = Field(default_factory=list)
    bottlenecks: list[Bottleneck] = Field(default_factory=list)
    mitigation_tasks: list[MitigationTask] = Field(default_factory=list)
    danger_points: list[MapDangerPoint] = Field(default_factory=list)
    map_routes: list[MapRouteSegment] = Field(default_factory=list)
    change_history: list[ChangeHistoryEntry] = Field(default_factory=list)
    mitigation_impacts: list[MitigationImpact] = Field(default_factory=list)
