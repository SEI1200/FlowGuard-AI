// ---------------------------------------------------------------------------
// FlowGuard AI - Extended Types (役割・対策・シナリオ・レポート等)
// ---------------------------------------------------------------------------

import type { LatLng } from "./index";
import type { RiskCategory } from "./index";

// --- 役割（誰の視点で見るか）------------------------------------------------

export enum UserRole {
  ORGANIZER = "organizer",
  SECURITY = "security",
  LOCAL_GOV = "local_gov",
  VENUE_MANAGER = "venue_manager",
}

// --- アラート閾値（保守的／標準／攻め）----------------------------------------

export enum AlertThreshold {
  CONSERVATIVE = "conservative",
  STANDARD = "standard",
  AGGRESSIVE = "aggressive",
}

// --- リスク要因分解（根拠表示）-----------------------------------------------

export type RiskFactorType =
  | "congestion"
  | "weather"
  | "terrain"
  | "circulation"
  | "visibility"
  | "emergency_route"
  | "bottleneck"
  | "other";

export interface RiskFactorContribution {
  factor: RiskFactorType;
  label: string;
  weight: number;
  explanation?: string;
}

export interface RiskFactorBreakdown {
  risk_id: string;
  factors: RiskFactorContribution[];
}

// --- 時系列リスク ------------------------------------------------------------

export interface RiskTimeSlot {
  start_time: string;
  end_time: string;
  risk_score: number;
  risk_ids: string[];
  label?: string;
}

// --- 複合条件リスク（雨天＋坂＋高密度など）----------------------------------

export interface CompositeRisk {
  id: string;
  title: string;
  description: string;
  conditions: string[];
  risk_ids: string[];
  severity: number;
  probability: number;
}

// --- ボトルネック（詰まりやすい箇所）----------------------------------------

export interface Bottleneck {
  id: string;
  location_description: string;
  center: LatLng;
  radius_meters: number;
  reason: string;
  severity: number;
  suggested_measures: string[];
}

// --- 対策タスク（誰が／何を／いつまでに／必要物品／工数）--------------------

export interface MitigationTask {
  id: string;
  risk_id?: string;
  who: string;
  action: string;
  due_by?: string;
  required_items?: string[];
  estimated_effort_hours?: number;
  impact_score?: number;
  execution_cost_level?: "low" | "medium" | "high";
  duration_minutes?: number;
  dependencies?: string[];
  category?: "general" | "rescue" | "traffic" | "deployment";
  checked?: boolean;
}

// --- 危険ポイント（マーカー＋理由）------------------------------------------

export type DangerPointReason =
  | "blind_spot"
  | "narrow"
  | "steps"
  | "slope"
  | "puddle"
  | "other";

export interface MapDangerPoint {
  id: string;
  center: LatLng;
  reason: DangerPointReason;
  label: string;
  risk_id?: string;
}

// --- 導線・規制線（2D地図上の描画要素）--------------------------------------

export interface MapRouteSegment {
  id: string;
  type: "recommended" | "restriction" | "one_way";
  path: LatLng[];
  label?: string;
}

// --- シナリオテンプレート ---------------------------------------------------

export interface ScenarioTemplate {
  id: string;
  name: string;
  event_type: string;
  preset: {
    event_name: string;
    event_location: string;
    expected_attendance: number;
    additional_notes?: string;
  };
}

// --- 入力バリデーション -----------------------------------------------------

export interface ValidationIssue {
  field?: string;
  code: string;
  message: string;
  severity: "error" | "warning";
}

// --- 条件セット保存／共有 ---------------------------------------------------

export interface SavedScenario {
  id: string;
  name: string;
  saved_at: string;
  config: import("./index").MissionConfig;
  polygon: LatLng[];
  role: UserRole;
}

// --- 変更履歴 ---------------------------------------------------------------

export interface ChangeHistoryEntry {
  at: string;
  change_type: "mitigation_added" | "mitigation_updated" | "mitigation_removed" | "config_changed";
  description: string;
  risk_before?: number;
  risk_after?: number;
}

// --- 定量評価（対策前後の改善量）---------------------------------------------

export interface MitigationImpact {
  mitigation_id: string;
  risk_score_delta: number;
  danger_count_delta?: number;
  congestion_time_delta_minutes?: number;
  indicators_improved: string[];
}

// --- レポート種別 -----------------------------------------------------------

export type ReportVariant =
  | "full"
  | "one_page"
  | "role_organizer"
  | "role_security"
  | "role_local_gov"
  | "runbook";
