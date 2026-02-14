/**
 * 対策前→対策後の定量差分を算出（ToDo チェック状態に連動）
 * 総合リスクスコア・危険ポイント数・混雑ピーク時間の差分を返す
 */

import type { SimulationResponse } from "../types";
import type { MitigationImpact, RiskTimeSlot } from "../types/extended";

/** 採用ToDo（対策効果で「解決したリスク」を数える用） */
export type AdoptedTaskRef = { id: string; risk_id?: string };

export interface DeltaSummary {
  riskScoreBefore: number;
  riskScoreAfter: number;
  riskScoreDelta: number;
  dangerCountBefore: number;
  dangerCountAfter: number;
  dangerCountDelta: number;
  riskItemCountBefore: number;
  riskItemCountAfter: number;
  riskItemCountDelta: number;
  peakTimeBeforeLabel: string;
  peakTimeAfterLabel: string;
  congestionDeltaMinutes: number;
  hasAnyChecked: boolean;
}

/**
 * シミュレーション結果と ToDo チェック状態から「対策前→対策後」の集計差分を計算する。
 * adoptedTasks を渡すと、リスク項目の件数変化（対策後＝未解決のリスク数）を算出する。
 */
export function computeDeltaSummary(
  data: SimulationResponse,
  todoChecks?: Record<string, boolean> | null,
  adoptedTasks?: AdoptedTaskRef[] | null,
): DeltaSummary {
  if (!data || typeof data !== "object") {
    return {
      riskScoreBefore: 0,
      riskScoreAfter: 0,
      riskScoreDelta: 0,
      dangerCountBefore: 0,
      dangerCountAfter: 0,
      dangerCountDelta: 0,
      riskItemCountBefore: 0,
      riskItemCountAfter: 0,
      riskItemCountDelta: 0,
      peakTimeBeforeLabel: "—",
      peakTimeAfterLabel: "—",
      congestionDeltaMinutes: 0,
      hasAnyChecked: false,
    };
  }
  const riskScoreBefore = data.overall_risk_score ?? 0;
  const dangerCountBefore = data.danger_points?.length ?? 0;
  const risks = data.risks ?? [];
  const riskItemCountBefore = risks.length;
  const timeSlots = Array.isArray(data.risk_time_series) ? data.risk_time_series : [];
  const topSlot = timeSlots.length
    ? timeSlots.reduce((a, b) => ((b?.risk_score ?? 0) > (a?.risk_score ?? 0) ? b : a))
    : null;
  const peakTimeBeforeLabel = topSlot?.label ?? "—";

  const checkedIds = new Set<string>();
  if (todoChecks && typeof todoChecks === "object") {
    for (const [id, checked] of Object.entries(todoChecks)) {
      if (checked === true) checkedIds.add(id);
    }
  }

  const impacts = (data.mitigation_impacts ?? []) as MitigationImpact[];
  let riskScoreDelta = 0;
  let dangerCountDelta = 0;
  let congestionDeltaMinutes = 0;

  for (const m of impacts) {
    const mid = m.mitigation_id != null ? String(m.mitigation_id) : "";
    if (!mid || !checkedIds.has(mid)) continue;
    riskScoreDelta += m.risk_score_delta ?? 0;
    dangerCountDelta += m.danger_count_delta ?? 0;
    congestionDeltaMinutes += m.congestion_time_delta_minutes ?? 0;
  }

  const riskScoreAfter = Math.max(0, Math.min(10, riskScoreBefore + riskScoreDelta));
  const dangerCountAfter = Math.max(0, dangerCountBefore + dangerCountDelta);

  let riskItemCountAfter = riskItemCountBefore;
  if (adoptedTasks && adoptedTasks.length > 0) {
    const resolvedRiskIds = new Set<string>();
    for (const risk of risks) {
      const tasksForRisk = adoptedTasks.filter((t) => t.risk_id === risk.id);
      if (tasksForRisk.length === 0) continue;
      const allChecked = tasksForRisk.every((t) => checkedIds.has(t.id));
      if (allChecked) resolvedRiskIds.add(risk.id);
    }
    riskItemCountAfter = Math.max(0, riskItemCountBefore - resolvedRiskIds.size);
  }
  const riskItemCountDelta = riskItemCountAfter - riskItemCountBefore;

  return {
    riskScoreBefore,
    riskScoreAfter,
    riskScoreDelta,
    dangerCountBefore,
    dangerCountAfter,
    dangerCountDelta,
    riskItemCountBefore,
    riskItemCountAfter,
    riskItemCountDelta,
    peakTimeBeforeLabel,
    peakTimeAfterLabel: peakTimeBeforeLabel,
    congestionDeltaMinutes,
    hasAnyChecked: checkedIds.size > 0,
  };
}

/** 対策完了済みリスクIDのセットを返す（adoptedTasks のうちすべてチェック済みの risk_id） */
function getResolvedRiskIds(
  adoptedTasks: AdoptedTaskRef[] | null | undefined,
  todoChecks: Record<string, boolean> | null | undefined,
): Set<string> {
  const resolved = new Set<string>();
  if (!adoptedTasks?.length || !todoChecks) return resolved;
  const riskToTasks = new Map<string, string[]>();
  for (const a of adoptedTasks) {
    if (a.risk_id) {
      const list = riskToTasks.get(a.risk_id) ?? [];
      list.push(a.id);
      riskToTasks.set(a.risk_id, list);
    }
  }
  for (const [riskId, taskIds] of riskToTasks) {
    if (taskIds.every((id) => todoChecks[id])) resolved.add(riskId);
  }
  return resolved;
}

/**
 * ToDo 解決状況に基づき、時間帯ごとのリスクスコアを下方修正した配列を返す。
 * 各スロットで「未解決のリスクの割合」に応じて risk_score を按分する。
 */
export function computeEffectiveTimeSlots(
  riskTimeSeries: RiskTimeSlot[] | null | undefined,
  adoptedTasks?: AdoptedTaskRef[] | null,
  todoChecks?: Record<string, boolean> | null,
): RiskTimeSlot[] {
  const slots = Array.isArray(riskTimeSeries) ? riskTimeSeries : [];
  if (slots.length === 0) return [];
  const resolvedIds = getResolvedRiskIds(adoptedTasks, todoChecks);
  return slots.map((slot) => {
    const riskIds = slot.risk_ids ?? [];
    const total = riskIds.length;
    if (total === 0) return { ...slot };
    const unresolvedCount = riskIds.filter((id) => !resolvedIds.has(id)).length;
    const ratio = unresolvedCount / total;
    const newScore = Math.max(0, Math.min(10, (slot.risk_score ?? 0) * ratio));
    return { ...slot, risk_score: newScore };
  });
}

/** 対策完了済みの ToDo 件数（チェック済みの採用ToDo） */
export function countResolvedTodos(
  adoptedTasks: AdoptedTaskRef[] | null | undefined,
  todoChecks: Record<string, boolean> | null | undefined,
): number {
  if (!adoptedTasks?.length || !todoChecks) return 0;
  return adoptedTasks.filter((t) => todoChecks[t.id]).length;
}
