/**
 * 次にやるべき確認・対策の提案を生成（重要ToDo未完了・期限超過・高リスク時間帯）
 * 採用/却下/保留の判断ログで却下した提案は次回出さない
 */

import type { SimulationResponse } from "../types";
import type { TranslationStrings } from "../i18n/translations";

export type ProposalSource = "unfinished_todo" | "overdue" | "high_risk_slot";

export interface NextActionProposal {
  key: string;
  title: string;
  reason: string;
  source: ProposalSource;
  taskId?: string;
  riskId?: string;
  slotLabel?: string;
}

export interface ProposalDecisionEntry {
  key: string;
  decision: "adopted" | "rejected" | "deferred";
  at: string;
}

function isRejected(key: string, log: ProposalDecisionEntry[]): boolean {
  return log.some((e) => e.key === key && e.decision === "rejected");
}

function isAdopted(key: string, log: ProposalDecisionEntry[]): boolean {
  return log.some((e) => e.key === key && e.decision === "adopted");
}

function shouldHideProposal(key: string, log: ProposalDecisionEntry[]): boolean {
  return isRejected(key, log) || isAdopted(key, log);
}

/**
 * 未完了・期限超過・高リスク時間帯から「次にやるべき」提案を生成
 * proposalsT を渡すとその locale の文言で title/reason を生成する
 */
export function computeNextActionProposals(
  data: SimulationResponse,
  todoChecks: Record<string, boolean> | null | undefined,
  eventDateIso: string | null | undefined,
  proposalDecisionLog: ProposalDecisionEntry[],
  proposalsT?: TranslationStrings["proposals"],
): NextActionProposal[] {
  try {
    const p = proposalsT ?? {
      reasonUnfinishedTodo: (r: string) => `重要対策が未実施です。リスク「${r}」の軽減のため。`,
      reasonHighImpact: "重要度の高い対策が未実施です。",
      titleDefault: "対策の実施",
      reasonOverdue: (d: string) => `期限（${d}）を過ぎています。早めの対応を推奨します。`,
      titleHighSlot: (l: string) => `${l} の時間帯はリスクが高めです`,
      reasonHighSlot: (s: string) => `時間帯別スコアが ${s} です。誘導員の確認や入場制限の検討を推奨します。`,
    };
    if (!data || typeof data !== "object") return [];
    const log = Array.isArray(proposalDecisionLog) ? proposalDecisionLog : [];
    const tasks = Array.isArray(data.mitigation_tasks) ? data.mitigation_tasks : [];
    const risks = Array.isArray(data.risks) ? data.risks : [];
    const timeSlots = Array.isArray(data.risk_time_series) ? data.risk_time_series : [];
    const checked = new Set<string>();
    if (todoChecks && typeof todoChecks === "object") {
      for (const [id, v] of Object.entries(todoChecks)) {
        if (v === true) checked.add(id);
      }
    }

    const riskMap = new Map(risks.filter((r) => r && r.id != null).map((r) => [r.id, r]));
  const proposals: NextActionProposal[] = [];

  const today = eventDateIso ? eventDateIso.slice(0, 10) : new Date().toISOString().slice(0, 10);

  for (const task of tasks) {
    if (!task || typeof task !== "object" || task.id == null) continue;
    if (checked.has(task.id)) continue;
    const risk = task.risk_id ? riskMap.get(task.risk_id) : null;
    const severity = risk?.severity ?? 5;
    const impact = task.impact_score ?? severity;

    const keyTodo = `todo:${task.id}`;
    if (shouldHideProposal(keyTodo, log)) continue;

    if (impact >= 6 || severity >= 7) {
      proposals.push({
        key: keyTodo,
        title: task.action?.slice(0, 60) || p.titleDefault,
        reason: risk
          ? p.reasonUnfinishedTodo((risk.title ?? "").slice(0, 30))
          : p.reasonHighImpact,
        source: "unfinished_todo",
        taskId: task.id,
        riskId: task.risk_id ?? undefined,
      });
      continue;
    }

    if (task.due_by && task.due_by < today) {
      const keyOverdue = `overdue:${task.id}`;
      if (shouldHideProposal(keyOverdue, log)) continue;
      proposals.push({
        key: keyOverdue,
        title: task.action?.slice(0, 60) || p.titleDefault,
        reason: p.reasonOverdue(task.due_by),
        source: "overdue",
        taskId: task.id,
        riskId: task.risk_id ?? undefined,
      });
    }
  }

  const highSlots = timeSlots.filter((s) => s != null && (s.risk_score ?? 0) >= 7);
  for (const slot of highSlots.slice(0, 2)) {
    const label = slot.label ?? slot.start_time?.slice(11, 16) ?? "—";
    const keySlot = `slot:${slot.start_time ?? label}`;
    if (shouldHideProposal(keySlot, log)) continue;
    proposals.push({
      key: keySlot,
      title: p.titleHighSlot(label),
      reason: p.reasonHighSlot((slot.risk_score ?? 0).toFixed(1)),
      source: "high_risk_slot",
      slotLabel: label,
    });
  }

  return proposals;
  } catch (_e) {
    return [];
  }
}
