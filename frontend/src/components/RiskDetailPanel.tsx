import { useState, useMemo } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Collapse from "@mui/material/Collapse";
import ShieldIcon from "@mui/icons-material/Shield";
import LinkIcon from "@mui/icons-material/Link";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import HistoryIcon from "@mui/icons-material/History";

import type { RiskItem, SimulationResponse } from "../types";
import type { RiskFactorBreakdown } from "../types";
import { RiskCategory, RISK_CATEGORY_COLORS } from "../types";
import { useLanguage } from "../i18n/LanguageContext";
import {
  computeDeltaSummary,
  computeEffectiveTimeSlots,
  countResolvedTodos,
  type AdoptedTaskRef,
} from "../utils/mitigationDelta";
import {
  type NextActionProposal,
  type ProposalDecisionEntry,
  computeNextActionProposals,
} from "../utils/nextActionProposals";

export type RiskDecision = "adopted" | "rejected" | "deferred";
export interface RiskDecisionEntry {
  decision: RiskDecision;
  reason?: string;
  at: string;
}
export interface DecisionLogEntry {
  riskId: string;
  title: string;
  decision: RiskDecision;
  reason?: string;
  at: string;
}

function SummaryView({
  data,
  todoChecks,
  eventDateIso,
  proposalDecisionLog,
  onProposalDecision,
  onAdoptTask,
  onAdoptProposal,
  adoptedTasks,
}: {
  data: SimulationResponse;
  todoChecks?: Record<string, boolean> | null;
  eventDateIso?: string | null;
  proposalDecisionLog?: ProposalDecisionEntry[];
  onProposalDecision?: (key: string, decision: "adopted" | "rejected" | "deferred") => void;
  onAdoptTask?: (taskId: string) => void;
  onAdoptProposal?: (proposal: NextActionProposal) => void;
  adoptedTasks?: AdoptedTaskRef[] | null;
}) {
  const { t } = useLanguage();
  const composite = data.composite_risks ?? [];
  const bottlenecks = data.bottlenecks ?? [];
  const rawTimeSlots = data.risk_time_series ?? [];
  const effectiveTimeSlots = useMemo(
    () => computeEffectiveTimeSlots(rawTimeSlots, adoptedTasks, todoChecks),
    [rawTimeSlots, adoptedTasks, todoChecks],
  );
  const timeSlots = effectiveTimeSlots.length > 0 ? effectiveTimeSlots : rawTimeSlots;
  const resolvedCount = countResolvedTodos(adoptedTasks, todoChecks);
  const sectionSx = { mb: 2 };
  const headingSx = { fontWeight: 600, mb: 0.75, fontSize: "0.875rem", color: "text.primary" };
  const originalSummary = (data.summary || "").replace(/\*\*/g, "");

  return (
    <Box sx={{ p: 2, overflow: "auto", height: "100%" }}>
      <Box sx={sectionSx}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.75, fontSize: "1rem" }}>
          {t.detail.analysisSummary}
        </Typography>
        {resolvedCount > 0 ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              {t.detailExtra.analysisEffectiveSummary(resolvedCount)}
            </Typography>
            {originalSummary && (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, fontWeight: 600 }}>
                  {t.detailExtra.analysisBeforeMitigationLabel}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, mt: 0.25 }}>
                  {originalSummary}
                </Typography>
              </>
            )}
          </>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            {originalSummary}
          </Typography>
        )}
      </Box>

      {composite.length > 0 && (
        <Box sx={sectionSx}>
          <Typography variant="subtitle2" sx={headingSx}>{t.detailExtra.compositeRisks}</Typography>
          <List dense disablePadding>
            {composite.slice(0, 3).map((c) => (
              <ListItem key={c.id} disableGutters sx={{ py: 0.25 }}>
                <ListItemText
                  primary={c.title}
                  secondary={c.conditions?.join(" ＋ ")}
                  primaryTypographyProps={{ variant: "body2" }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {timeSlots.length > 0 && (
        <Box sx={sectionSx}>
          <Typography variant="subtitle2" sx={headingSx}>
            {t.detailExtra.timeSlotGrid}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
              gap: 0.75,
            }}
          >
            {timeSlots.map((slot, idx) => {
              const score = slot.risk_score ?? 0;
              const isHigh = score >= 7;
              const isMid = score >= 5 && score < 7;
              return (
                <Box
                  key={idx}
                  sx={{
                    py: 0.75,
                    px: 1,
                    borderRadius: 1,
                    bgcolor: isHigh ? "error.light" : isMid ? "warning.light" : "action.hover",
                    color: isHigh ? "error.contrastText" : isMid ? "warning.contrastText" : "text.secondary",
                    fontSize: "0.8125rem",
                    textAlign: "center",
                  }}
                >
                  <Box sx={{ fontWeight: 600 }}>{slot.label ?? "—"}</Box>
                  <Box sx={{ fontSize: "0.75rem", opacity: 0.95 }}>{t.detailExtra.scoreLabel} {score.toFixed(1)}</Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {bottlenecks.length > 0 && (
        <Box sx={sectionSx}>
          <Typography variant="subtitle2" sx={headingSx}>{t.detailExtra.bottlenecks}</Typography>
          <List dense disablePadding>
            {bottlenecks.slice(0, 3).map((b) => (
              <ListItem key={b.id} disableGutters sx={{ py: 0.25 }}>
                <ListItemText
                  primary={b.location_description || b.reason}
                  secondary={b.reason}
                  primaryTypographyProps={{ variant: "body2" }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <Box sx={sectionSx}>
        <Typography variant="subtitle2" sx={headingSx}>
          {t.detail.topRecommendations}
        </Typography>
        <List dense disablePadding>
        {data.recommendations.map((rec, idx) => (
          <ListItem key={idx} disableGutters sx={{ alignItems: "flex-start", py: 0.25 }}>
            <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
              <LightbulbIcon fontSize="small" color="secondary" />
            </ListItemIcon>
            <ListItemText
              primary={(rec || "").replace(/\*\*/g, "")}
              primaryTypographyProps={{ variant: "body2", sx: { lineHeight: 1.5 } }}
            />
          </ListItem>
        ))}
      </List>
      </Box>
    </Box>
  );
}

export function MeasuresAndNextActionsPanel({
  data,
  todoChecks,
  adoptedTasks,
  eventDateIso,
  proposalDecisionLog,
  onProposalDecision,
  onAdoptTask,
  onAdoptProposal,
}: {
  data: SimulationResponse;
  todoChecks?: Record<string, boolean> | null;
  adoptedTasks?: AdoptedTaskRef[] | null;
  eventDateIso?: string | null;
  proposalDecisionLog?: ProposalDecisionEntry[];
  onProposalDecision?: (key: string, decision: "adopted" | "rejected" | "deferred") => void;
  onAdoptTask?: (taskId: string) => void;
  onAdoptProposal?: (proposal: NextActionProposal) => void;
}) {
  const { t } = useLanguage();
  const delta = computeDeltaSummary(data, todoChecks, adoptedTasks);
  const proposals = computeNextActionProposals(data, todoChecks, eventDateIso, proposalDecisionLog ?? [], t.proposals);
  const sectionSx = { mb: 2 };
  const headingSx = { fontWeight: 600, mb: 0.75, fontSize: "0.875rem", color: "text.primary" };

  const handleProposalDecision = (p: NextActionProposal, decision: "adopted" | "rejected" | "deferred") => {
    if (!p?.key) return;
    const key = String(p.key);
    const taskId = p.taskId != null && p.taskId !== "" ? String(p.taskId) : undefined;
    const proposal = p;
    queueMicrotask(() => {
      try {
        onProposalDecision?.(key, decision);
        if (decision === "adopted") {
          onAdoptProposal?.(proposal);
        }
      } catch (e) {
        console.error("[FlowGuard] proposal decision callback", e);
      }
    });
  };

  return (
    <Box sx={{ p: 2, overflow: "auto", height: "100%" }}>
      {(data.mitigation_impacts?.length ?? 0) > 0 && (
        <Box sx={sectionSx}>
          <Typography variant="subtitle2" sx={headingSx}>
            {t.detailExtra.mitigationEffectTitle}
          </Typography>
          <Box
            sx={{
              p: 1.5,
              bgcolor: delta.hasAnyChecked
                ? "rgba(52, 199, 89, 0.12)"
                : "action.hover",
              color: delta.hasAnyChecked ? "rgba(0, 0, 0, 0.85)" : "text.secondary",
              borderLeft: delta.hasAnyChecked ? "4px solid #34C759" : "none",
              borderRadius: 1,
              fontSize: "0.875rem",
            }}
          >
            <Stack spacing={0.75}>
              <Box>
                {t.layer.overallRiskScore}: <strong>{delta.riskScoreBefore.toFixed(1)}</strong>
                {" → "}
                <strong>{delta.riskScoreAfter.toFixed(1)}</strong>
                {delta.riskScoreDelta !== 0 && (
                  <Box component="span" sx={{ ml: 0.5 }}>
                    （{delta.riskScoreDelta <= 0 ? t.detailExtra.improvement(Math.abs(delta.riskScoreDelta).toFixed(1)) : t.detailExtra.worsening(delta.riskScoreDelta.toFixed(1))}）
                  </Box>
                )}
              </Box>
              <Box>
                {t.detailExtra.riskItemsLabel}: <strong>{delta.riskItemCountBefore}{t.detailExtra.dangerCountUnit}</strong>
                {" → "}
                <strong>{delta.riskItemCountAfter}{t.detailExtra.dangerCountUnit}</strong>
                {delta.riskItemCountDelta !== 0 && (
                  <Box component="span" sx={{ ml: 0.5 }}>
                    （{delta.riskItemCountDelta <= 0 ? `△${Math.abs(delta.riskItemCountDelta)}${t.detailExtra.dangerCountUnit}` : `+${delta.riskItemCountDelta}${t.detailExtra.dangerCountUnit}`}）
                  </Box>
                )}
              </Box>
              {delta.congestionDeltaMinutes !== 0 && (
                <Box>
                  {t.detailExtra.congestionPeakShort(Math.abs(delta.congestionDeltaMinutes).toFixed(0))}
                </Box>
              )}
            </Stack>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            {t.detailExtra.todoCheckRecalcHint}
          </Typography>
        </Box>
      )}

      {proposals.length > 0 && (
        <Box sx={sectionSx}>
          <Typography variant="subtitle2" sx={headingSx}>
            {t.detailExtra.nextActionsTitle}
          </Typography>
          <Stack spacing={1}>
            {proposals.map((p) => (
              <Box
                key={p.key}
                sx={{
                  p: 1.25,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  bgcolor: "background.paper",
                }}
              >
                <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                  {p.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                  {t.detailExtra.reasonLabel}: {p.reason}
                </Typography>
                <Stack direction="row" spacing={0.5}>
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    onClick={() => handleProposalDecision(p, "adopted")}
                    sx={{ textTransform: "none", fontSize: "0.75rem" }}
                  >
                    {t.detailExtra.adopt}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleProposalDecision(p, "rejected")}
                    sx={{ textTransform: "none", fontSize: "0.75rem" }}
                  >
                    {t.detailExtra.reject}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    onClick={() => handleProposalDecision(p, "deferred")}
                    sx={{ textTransform: "none", fontSize: "0.75rem" }}
                  >
                    {t.detailExtra.defer}
                  </Button>
                </Stack>
              </Box>
            ))}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            {t.detailExtra.rejectedHint}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export function riskTitleOnly(s: string): string {
  if (!s || typeof s !== "string") return "";
  const i = s.indexOf(" - ");
  const j = s.indexOf(" — ");
  const k = i >= 0 ? (j >= 0 ? Math.min(i, j) : i) : j;
  return k >= 0 ? s.slice(0, k).trim() : s.trim();
}

function DetailView({
  risk,
  factorBreakdown,
  onShowMeasuresPanel,
}: {
  risk: RiskItem;
  factorBreakdown?: RiskFactorBreakdown | null;
  onShowMeasuresPanel?: () => void;
}) {
  const { t } = useLanguage();
  const catColor = RISK_CATEGORY_COLORS[risk.category];
  const catLabel = t.riskCategories[risk.category] ?? risk.category;
  const titleDisplay = riskTitleOnly(risk.title);

  const sectionSx = { mb: 2 };
  const headingSx = { fontWeight: 600, mb: 0.75, fontSize: "0.875rem" };

  const isLegalCompliance = risk.category === RiskCategory.LEGAL_COMPLIANCE;
  const factors = isLegalCompliance
    ? [{ label: t.detail.severity, weight: risk.severity / 10, explanation: undefined as string | undefined }]
    : factorBreakdown?.factors?.length
      ? factorBreakdown.factors
      : [
          { label: t.detail.severity, weight: risk.severity / 10, explanation: undefined as string | undefined },
          { label: t.detail.probability, weight: risk.probability, explanation: undefined as string | undefined },
        ];

  return (
    <Box sx={{ p: 2, overflow: "auto", height: "100%" }}>
      <Box sx={sectionSx}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: catColor, flexShrink: 0 }} />
          <Chip label={catLabel} size="small" sx={{ bgcolor: catColor, color: "#FFF", fontWeight: 600 }} />
        </Stack>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
          {titleDisplay}
        </Typography>
        {risk.location_description && (
          <Typography variant="body2" sx={{ color: "primary.main", fontWeight: 600, fontSize: "0.8125rem" }}>
            {t.detail.location}: {risk.location_description}
          </Typography>
        )}
        {risk.description && (
          <Box sx={{ mt: 1 }}>
            {t.detail.description && (
              <Typography variant="subtitle2" sx={{ ...headingSx, mb: 0.25 }}>{t.detail.description}</Typography>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {risk.description}
            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={sectionSx}>
        <Typography variant="subtitle2" sx={headingSx}>
          {t.detail.factorBreakdown}
        </Typography>
        <List dense disablePadding sx={{ listStyle: "disc", pl: 2, mb: 0.5 }}>
          {factors.map((f: { label: string; weight: number; explanation?: string }, idx: number) => (
            <ListItem key={idx} disableGutters sx={{ display: "list-item", py: 0.25 }}>
              <ListItemText
                primary={f.explanation ? `${f.label} (${(f.weight * 100).toFixed(0)}%): ${f.explanation}` : t.detailExtra.factorContribution(f.label, (f.weight * 100).toFixed(0))}
                primaryTypographyProps={{
                  variant: "body2",
                  color: "text.secondary",
                  sx: { whiteSpace: "normal", wordBreak: "break-word" },
                }}
              />
            </ListItem>
          ))}
        </List>
        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
          {factors.map((f: { label: string; weight: number }, idx: number) => (
            <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <LinearProgress variant="determinate" value={f.weight * 100} sx={{ flex: 1, height: 6, borderRadius: 1 }} />
              <Typography variant="caption" sx={{ minWidth: 80 }}>{f.label} {(f.weight * 100).toFixed(0)}%</Typography>
            </Box>
          ))}
        </Stack>
      {risk.evidence && (
        <Typography variant="caption" color="primary.main" sx={{ display: "block", mt: 0.5, fontStyle: "italic", whiteSpace: "normal", wordBreak: "break-word" }}>
          {t.detail.evidence}: {risk.evidence}
        </Typography>
      )}
      </Box>

      <Box sx={sectionSx}>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
          <ShieldIcon fontSize="small" color="success" />
          <Typography variant="subtitle2" sx={headingSx}>{t.detail.mitigationActions}</Typography>
        </Stack>
      {risk.mitigation_actions.length > 0 ? (
        <List dense disablePadding sx={{ mb: 1 }}>
          {risk.mitigation_actions.map((action, idx) => (
            <ListItem key={idx} disableGutters sx={{ py: 0.25 }}>
              <ListItemText
                primary={`・ ${action}`}
                primaryTypographyProps={{
                  variant: "body2",
                  color: "text.secondary",
                  sx: { whiteSpace: "normal", wordBreak: "break-word" },
                }}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">{t.detailExtra.noMitigationMessage}</Typography>
      )}
      {onShowMeasuresPanel && (
        <Button
          size="small"
          variant="outlined"
          startIcon={<LinkIcon />}
          onClick={onShowMeasuresPanel}
          sx={{ mt: 0.5, textTransform: "none" }}
        >
          {t.detailExtra.showMeasuresAction}
        </Button>
      )}
      </Box>

      {/* 代替案（拡張用：APIで返る場合は表示） */}
      {(risk as RiskItem & { alternatives?: string[] }).alternatives?.length ? (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, mt: 1 }}>{t.detailExtra.alternativesTitle}</Typography>
          <List dense disablePadding>
            {(risk as RiskItem & { alternatives: string[] }).alternatives.map((alt, idx) => (
              <ListItem key={idx} disableGutters sx={{ py: 0.25 }}>
                <ListItemText
                  primary={alt}
                  primaryTypographyProps={{
                    variant: "body2",
                    color: "text.secondary",
                    sx: { whiteSpace: "normal", wordBreak: "break-word" },
                  }}
                />
              </ListItem>
            ))}
          </List>
        </>
      ) : null}

      {/* 5. トレードオフ（拡張用） */}
      {(risk as RiskItem & { tradeoffs?: string }).tradeoffs && (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, mt: 1 }}>{t.detailExtra.tradeoffsTitle}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "normal", wordBreak: "break-word" }}>{(risk as RiskItem & { tradeoffs: string }).tradeoffs}</Typography>
        </>
      )}

      {/* 連鎖リスク */}
      {risk.cascading_risks.length > 0 && (
        <>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5, mt: 1.5 }}>
            <LinkIcon fontSize="small" color="warning" />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{t.detail.cascadingRisks}</Typography>
          </Stack>
          <List dense disablePadding>
            {risk.cascading_risks.map((cascade, idx) => (
              <ListItem key={idx} disableGutters sx={{ py: 0.25 }}>
                <ListItemIcon sx={{ minWidth: 28 }}><WarningAmberIcon fontSize="small" sx={{ color: "#F57C00" }} /></ListItemIcon>
                <ListItemText
                  primary={cascade}
                  primaryTypographyProps={{
                    variant: "body2",
                    color: "text.secondary",
                    sx: { whiteSpace: "normal", wordBreak: "break-word" },
                  }}
                />
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Box>
  );
}

interface RiskDetailPanelProps {
  data: SimulationResponse;
  selectedRisk: RiskItem | null;
  riskFactorBreakdowns?: RiskFactorBreakdown[] | null;
  riskDecisions?: Record<string, RiskDecisionEntry>;
  onRiskDecision?: (riskId: string, decision: RiskDecision, reason?: string) => void;
  decisionLog?: DecisionLogEntry[];
  /** ToDo チェック状態（対策前→対策後の差分再計算に使用） */
  todoChecks?: Record<string, boolean> | null;
  /** 開催日（ISO）。次にやるべき提案の期限判定に使用 */
  eventDateIso?: string | null;
  /** 提案の採用/却下/保留ログ（次回提案から却下分を除外） */
  proposalDecisionLog?: ProposalDecisionEntry[];
  onProposalDecision?: (key: string, decision: "adopted" | "rejected" | "deferred") => void;
  /** 提案「採用」時にToDoをチェックする場合のコールバック */
  onAdoptTask?: (taskId: string) => void;
  /** 提案「採用」時に対策ToDoリストへ追加するコールバック */
  onAdoptProposal?: (proposal: import("../utils/nextActionProposals").NextActionProposal) => void;
  /** 対策・次アクションタブを表示する（分析タブで「対策アクションを表示」クリック時） */
  onShowMeasuresPanel?: () => void;
  /** 採用済みToDo（分析サマリー・時間帯リスクの対策反映に使用） */
  adoptedTasks?: AdoptedTaskRef[] | null;
}

function DecisionLogBlock({ log }: { log: DecisionLogEntry[] }) {
  const { t, locale } = useLanguage();
  const [open, setOpen] = useState(false);
  if (!log.length) return null;
  return (
    <Box sx={{ borderTop: "1px solid", borderColor: "divider", mt: 1 }}>
      <ListItemButton onClick={() => setOpen((o) => !o)} sx={{ py: 0.5 }}>
        <ListItemIcon sx={{ minWidth: 32 }}><HistoryIcon fontSize="small" /></ListItemIcon>
        <ListItemText primary={t.detailExtra.decisionLog} secondary={t.detailExtra.logCount(log.length)} primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
      </ListItemButton>
      <Collapse in={open}>
        <List dense disablePadding sx={{ pb: 1, px: 2 }}>
          {[...log].reverse().slice(0, 20).map((e, idx) => {
            const title = String(e.title ?? e.riskId ?? "");
            const atStr = e.at ? new Date(e.at).toLocaleString(locale) : "";
            const decisionLabel = e.decision === "adopted" ? t.detailExtra.decisionAdopted : e.decision === "rejected" ? t.detailExtra.decisionRejected : t.detailExtra.decisionDeferred;
            return (
            <ListItem key={`${e.riskId}-${e.at}-${idx}`} disableGutters sx={{ py: 0.25 }}>
              <ListItemText
                primary={`${decisionLabel}: ${riskTitleOnly(title).slice(0, 30)}${riskTitleOnly(title).length > 30 ? "…" : ""}`}
                secondary={e.reason ? `${t.detailExtra.reasonLabel}: ${e.reason}` : atStr}
                primaryTypographyProps={{ variant: "caption" }}
                secondaryTypographyProps={{ variant: "caption" }}
              />
            </ListItem>
            );
          })}
        </List>
      </Collapse>
    </Box>
  );
}

export default function RiskDetailPanel({
  data,
  selectedRisk,
  riskFactorBreakdowns,
  riskDecisions,
  onRiskDecision,
  decisionLog = [],
  todoChecks,
  eventDateIso,
  proposalDecisionLog,
  onProposalDecision,
  onAdoptTask,
  onAdoptProposal,
  onShowMeasuresPanel,
  adoptedTasks,
}: RiskDetailPanelProps) {
  const factorBreakdown = selectedRisk && riskFactorBreakdowns?.length
    ? riskFactorBreakdowns.find((b) => b.risk_id === selectedRisk.id) ?? null
    : null;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {selectedRisk ? (
          <DetailView
            risk={selectedRisk}
            factorBreakdown={factorBreakdown ?? undefined}
            onShowMeasuresPanel={onShowMeasuresPanel}
          />
        ) : (
          <SummaryView
            data={data}
            todoChecks={todoChecks}
            eventDateIso={eventDateIso}
            proposalDecisionLog={proposalDecisionLog}
            onProposalDecision={onProposalDecision}
            onAdoptTask={onAdoptTask}
            onAdoptProposal={onAdoptProposal}
            adoptedTasks={adoptedTasks}
          />
        )}
      </Box>
      <DecisionLogBlock log={decisionLog} />
    </Box>
  );
}
