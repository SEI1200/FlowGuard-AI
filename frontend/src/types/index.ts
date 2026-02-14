export {
  UserRole,
  AlertThreshold,
  type RiskFactorContribution,
  type RiskFactorBreakdown,
  type RiskTimeSlot,
  type CompositeRisk,
  type Bottleneck,
  type MitigationTask,
  type MapDangerPoint,
  type MapRouteSegment,
  type ScenarioTemplate,
  type ValidationIssue,
  type SavedScenario,
  type ChangeHistoryEntry,
  type MitigationImpact,
  type ReportVariant,
} from "./extended";
import type {
  RiskFactorBreakdown,
  RiskTimeSlot,
  CompositeRisk,
  Bottleneck,
  MitigationTask,
  MapDangerPoint,
  MapRouteSegment,
  ChangeHistoryEntry,
  MitigationImpact,
} from "./extended";

export enum RiskCategory {
  CROWD_SAFETY = "crowd_safety",
  TRAFFIC_LOGISTICS = "traffic_logistics",
  ENVIRONMENTAL_HEALTH = "environmental_health",
  OPERATIONAL = "operational",
  VISIBILITY = "visibility",
  LEGAL_COMPLIANCE = "legal_compliance",
}

export enum EventType {
  MUSIC_FESTIVAL = "music_festival",
  FIREWORKS = "fireworks",
  SPORTS_EVENT = "sports_event",
  EXHIBITION = "exhibition",
  OTHER = "other",
}

export enum AudienceType {
  YOUTH = "youth",
  FAMILY = "family",
  ELDERLY = "elderly",
  MIXED = "mixed",
}

export enum WeatherCondition {
  CLEAR = "clear",
  CLOUDY = "cloudy",
  RAIN = "rain",
  HEAVY_RAIN = "heavy_rain",
  STORM = "storm",
  SNOW = "snow",
  EXTREME_HEAT = "extreme_heat",
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  name: string;
  memo?: string;
  type: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RiskLocation {
  center: LatLng;
  radius_meters: number;
}

export interface RiskItem {
  id: string;
  category: RiskCategory;
  title: string;
  description: string;
  probability: number;
  severity: number;
  location: RiskLocation;
  location_description?: string;
  mitigation_actions: string[];
  cascading_risks: string[];
  /** 重要度×緊急度用（1-10、未設定時は severity から算出） */
  importance?: number;
  urgency?: number;
  execution_difficulty?: number;
  /** 根拠・要因分解（どの入力・条件が主因か） */
  evidence?: string;
}

// --- Request / Response ----------------------------------------------------

export interface SimulationRequest {
  event_name: string;
  event_type: EventType;
  event_location: string;
  date_time: string;
  expected_attendance: number;
  audience_type: AudienceType;
  temperature_celsius?: number | null;
  precipitation_probability?: number | null;
  weather_condition?: WeatherCondition | null;
  polygon: LatLng[];
  additional_notes: string;
  locale: string;
  role?: string;
  alert_threshold?: string;
}

export interface TrafficPrediction {
  road_name: string;
  coordinates: LatLng[];
  congestion_level: number;
}

export interface SimulationResponse {
  simulation_id: string;
  event_name: string;
  event_location?: string;
  date_time?: string;
  risks: RiskItem[];
  overall_risk_score: number;
  summary: string;
  recommendations: string[];
  risk_count_by_category: Record<string, number>;
  traffic_predictions?: TrafficPrediction[];
  weather_used?: {
    temperature_celsius: number;
    precipitation_probability: number;
    weather_condition: string;
  };
  risk_factor_breakdowns?: RiskFactorBreakdown[];
  risk_time_series?: RiskTimeSlot[];
  composite_risks?: CompositeRisk[];
  bottlenecks?: Bottleneck[];
  mitigation_tasks?: MitigationTask[];
  danger_points?: MapDangerPoint[];
  map_routes?: MapRouteSegment[];
  change_history?: ChangeHistoryEntry[];
  mitigation_impacts?: MitigationImpact[];
}

// --- Mission config (Step 1 form state) ------------------------------------

export interface MissionConfig {
  event_name: string;
  event_type: EventType;
  event_location: string;
  /** 開催日 YYYY-MM-DD */
  event_date: string;
  /** 開始時刻 HH:mm */
  start_time: string;
  /** 終了時刻 HH:mm */
  end_time: string;
  /** API用: "YYYY-MM-DD HH:mm–HH:mm" の形式で送信。旧データ互換用に読み込み時のみ存在することもある */
  date_time?: string;
  expected_attendance: number;
  audience_type: AudienceType;
  additional_notes: string;
  role?: string;
  alert_threshold?: string;
}

// --- UI constants ----------------------------------------------------------

export const RISK_CATEGORY_COLORS: Record<RiskCategory, string> = {
  [RiskCategory.CROWD_SAFETY]: "#D32F2F",
  [RiskCategory.TRAFFIC_LOGISTICS]: "#1565C0",
  [RiskCategory.ENVIRONMENTAL_HEALTH]: "#F9A825",
  [RiskCategory.OPERATIONAL]: "#E65100",
  [RiskCategory.VISIBILITY]: "#7B1FA2",
  [RiskCategory.LEGAL_COMPLIANCE]: "#00695C",
};
