/**
 * What-if 比較: 複数ケース（参加者数・時間帯・天候等を変えたシミュレーション）の型
 */

import type { LatLng, MissionConfig, SimulationResponse } from "./index";

export interface WhatIfCase {
  id: string;
  label: string;
  config: MissionConfig;
  polygon: LatLng[];
  result: SimulationResponse;
  createdAt: string;
}

export function getCaseMetrics(res: SimulationResponse) {
  const dangerCount = res.danger_points?.length ?? 0;
  const topSlot = (res.risk_time_series ?? []).reduce(
    (a, b) => (b.risk_score > a.risk_score ? b : a),
    { risk_score: 0, label: "—" } as { risk_score: number; label?: string }
  );
  const topRisks = [...(res.risks ?? [])]
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 3)
    .map((r) => r.title);
  return {
    overallScore: res.overall_risk_score,
    dangerCount,
    peakTimeLabel: topSlot?.label ?? "—",
    topRisks,
  };
}

/** 最も効果が大きいケース（スコアが低い＝改善）を選ぶ */
export function getBestCase(
  cases: { result: SimulationResponse }[]
): number {
  if (cases.length === 0) return -1;
  let bestIdx = 0;
  let bestScore = cases[0].result.overall_risk_score;
  const bestDanger = cases[0].result.danger_points?.length ?? 0;
  for (let i = 1; i < cases.length; i++) {
    const score = cases[i].result.overall_risk_score;
    const danger = cases[i].result.danger_points?.length ?? 0;
    if (score < bestScore || (score === bestScore && danger < bestDanger)) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}
