import { Component, useCallback, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import Switch from "@mui/material/Switch";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import PlaceIcon from "@mui/icons-material/Place";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import MapIcon from "@mui/icons-material/Map";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import AssignmentIcon from "@mui/icons-material/Assignment";

import type { LatLng, MapPin, MissionConfig, RiskItem, SimulationResponse } from "../types";
import type { WhatIfCase } from "../types/whatIf";
import type { SiteCheckItem } from "../types/siteCheck";
import { RiskCategory, RISK_CATEGORY_COLORS } from "../types";
import { useLanguage } from "../i18n/LanguageContext";
import { downloadReportPdf } from "../services/api";
import { computeDeltaSummary } from "../utils/mitigationDelta";
import { PIN_TYPE_IDS, getPinTypeLabel } from "../utils/pins";

import MapView from "./MapView";
import Cesium3DView from "./Cesium3DView";
import MapControlsOverlay from "./MapControlsOverlay";
import RiskLayerControl, { type MapTypeId } from "./RiskLayerControl";
import RiskDetailPanel, { MeasuresAndNextActionsPanel, type RiskDecisionEntry, type DecisionLogEntry, riskTitleOnly } from "./RiskDetailPanel";
import type { NextActionProposal, ProposalDecisionEntry } from "../utils/nextActionProposals";
import type { AdoptedProposalSnapshot, MapTodo } from "../services/firebase";
import MitigationTodoList from "./MitigationTodoList";
import WhatIfCompare from "./WhatIfCompare";
import SiteCheckMemo from "./SiteCheckMemo";

export type RiskSortKey = "severity" | "importance" | "urgency" | "execution_difficulty";

class RightPanelErrorBoundary extends Component<
  { children: React.ReactNode; onReset?: () => void },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("[FlowGuard] Right panel render error", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            表示中にエラーが発生しました。
          </Typography>
          <Button size="small" variant="outlined" onClick={() => this.setState({ hasError: false, error: null })}>
            再表示
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

const ROLE_SORT_DEFAULT: Record<string, RiskSortKey> = {
  organizer: "importance",
  security: "urgency",
  local_gov: "severity",
  venue_manager: "execution_difficulty",
};

interface RiskDashboardProps {
  apiKey: string;
  data: SimulationResponse;
  polygon: LatLng[];
  missionConfig?: MissionConfig | null;
  /** 共有プロジェクトの TODO チェック状態（同期用） */
  todoChecks?: Record<string, boolean>;
  onTodoCheck?: (taskId: string, checked: boolean) => void;
  /** 対策ToDoの担当・現場確認済（参加中は共有） */
  todoAssignees?: Record<string, string>;
  onTodoAssignee?: (taskId: string, value: string) => void;
  todoAssigneeOther?: Record<string, string>;
  onTodoAssigneeOther?: (taskId: string, value: string) => void;
  todoOnSiteChecks?: Record<string, boolean>;
  onTodoOnSiteCheck?: (taskId: string, checked: boolean) => void;
  /** What-if 比較 */
  whatIfCases?: WhatIfCase[];
  whatIfLoading?: boolean;
  onRunAndAddCase?: (config: MissionConfig, label: string) => Promise<void>;
  onAdoptCase?: (result: SimulationResponse) => void;
  locale?: string;
  /** 現場確認メモ（PDF詳細に差し込み） */
  siteCheckMemos?: SiteCheckItem[];
  onSiteCheckMemosChange?: (items: SiteCheckItem[]) => void;
  /** 地図ピン（共有プロジェクト時のみ。同期用） */
  pins?: MapPin[];
  addPin?: (pin: { lat: number; lng: number; name: string; memo?: string; type: string }) => Promise<MapPin>;
  updatePin?: (pinId: string, updates: { name?: string; memo?: string; type?: string }) => Promise<void>;
  deletePin?: (pinId: string) => Promise<void>;
  /** 地図上の「ここを直す」To-Do（参加中は共有） */
  mapTodos?: MapTodo[];
  addMapTodo?: (todo: { lat: number; lng: number; title: string }) => Promise<MapTodo>;
  deleteMapTodo?: (taskId: string) => Promise<void>;
  isInProject?: boolean;
  /** 提案の採用・却下・保留ログ（参加中は共有データ） */
  proposalDecisionLog?: ProposalDecisionEntry[];
  /** 採用済み提案（参加中は共有データ） */
  adoptedProposals?: AdoptedProposalSnapshot[];
  /** 提案の判断を1件追加（参加中は Firestore に保存） */
  onProposalDecision?: (entry: ProposalDecisionEntry) => void;
  /** 採用済み提案を1件追加（参加中は Firestore に保存） */
  onAdoptedProposal?: (item: AdoptedProposalSnapshot) => void;
}

export default function RiskDashboard({
  apiKey,
  data,
  polygon,
  missionConfig,
  todoChecks,
  onTodoCheck,
  todoAssignees,
  onTodoAssignee,
  todoAssigneeOther,
  onTodoAssigneeOther,
  todoOnSiteChecks,
  onTodoOnSiteCheck,
  whatIfCases = [],
  whatIfLoading = false,
  onRunAndAddCase,
  onAdoptCase,
  locale = "ja",
  siteCheckMemos = [],
  onSiteCheckMemosChange,
  pins = [],
  addPin,
  updatePin,
  deletePin,
  mapTodos = [],
  addMapTodo,
  deleteMapTodo,
  isInProject = false,
  proposalDecisionLog: proposalDecisionLogFromProps,
  adoptedProposals: adoptedProposalsFromProps,
  onProposalDecision,
  onAdoptedProposal,
}: RiskDashboardProps) {
  const { t } = useLanguage();

  const [pinAddMode, setPinAddMode] = useState(false);
  const [mapTodoAddMode, setMapTodoAddMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingMapTodo, setPendingMapTodo] = useState<{ lat: number; lng: number } | null>(null);
  const [newMapTodoTitle, setNewMapTodoTitle] = useState("");
  const [mapTodoSaving, setMapTodoSaving] = useState(false);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [newPinName, setNewPinName] = useState("");
  const [newPinMemo, setNewPinMemo] = useState("");
  const [newPinType, setNewPinType] = useState("other");
  const [pinEditName, setPinEditName] = useState("");
  const [pinEditMemo, setPinEditMemo] = useState("");
  const [pinEditType, setPinEditType] = useState("");
  const [pinDetailEditMode, setPinDetailEditMode] = useState(false);
  const [pinSaving, setPinSaving] = useState(false);
  const [localTodoChecks, setLocalTodoChecks] = useState<Record<string, boolean>>({});

  const [visibleCategories, setVisibleCategories] = useState<Set<RiskCategory>>(
    () => new Set(Object.values(RiskCategory)),
  );
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [mapTypeId, setMapTypeId] = useState<MapTypeId>("roadmap");
  const roleFromConfig = missionConfig?.role ?? "";
  const [riskSortKey, setRiskSortKey] = useState<RiskSortKey>("severity");
  const [hideResolvedRisks, setHideResolvedRisks] = useState(false);
  const [pdfVariant, setPdfVariant] = useState<string>("full");
  const [riskDecisions, setRiskDecisions] = useState<Record<string, RiskDecisionEntry>>({});
  const [decisionLog, setDecisionLog] = useState<DecisionLogEntry[]>([]);
  const [proposalDecisionLog, setProposalDecisionLog] = useState<ProposalDecisionEntry[]>([]);
  const [focusedTodoRiskId, setFocusedTodoRiskId] = useState<string | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState(0);
  const [adoptedProposals, setAdoptedProposals] = useState<NextActionProposal[]>([]);

  /** 左パネル（リスク一覧）幅（px）。ドラッグでリサイズ可能 */
  const [leftPanelWidth, setLeftPanelWidth] = useState(260);
  /** 右パネル（分析等）幅（px）。ドラッグでリサイズ可能 */
  const [rightPanelWidth, setRightPanelWidth] = useState(400);
  const [resizeState, setResizeState] = useState<{ side: "left" | "right"; startX: number; startWidth: number } | null>(null);

  const LEFT_PANEL_MIN = 200;
  const LEFT_PANEL_MAX = 500;
  const RIGHT_PANEL_MIN = 280;
  const RIGHT_PANEL_MAX = 600;

  useEffect(() => {
    if (resizeState == null) return;
    const onMove = (e: MouseEvent) => {
      const delta = resizeState.side === "left" ? e.clientX - resizeState.startX : resizeState.startX - e.clientX;
      const nextWidth = Math.round(Math.max(0, resizeState.startWidth + delta));
      if (resizeState.side === "left") {
        setLeftPanelWidth((w) => Math.min(LEFT_PANEL_MAX, Math.max(LEFT_PANEL_MIN, nextWidth)));
      } else {
        setRightPanelWidth((w) => Math.min(RIGHT_PANEL_MAX, Math.max(RIGHT_PANEL_MIN, nextWidth)));
      }
    };
    const onUp = () => setResizeState(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizeState]);

  const effectiveProposalDecisionLog =
    isInProject && Array.isArray(proposalDecisionLogFromProps)
      ? proposalDecisionLogFromProps
      : proposalDecisionLog;

  const effectiveAdoptedProposals = useMemo(() => {
    if (isInProject && Array.isArray(adoptedProposalsFromProps)) return adoptedProposalsFromProps;
    return adoptedProposals.map((p) => ({ key: p.key, title: p.title, taskId: p.taskId, riskId: p.riskId }));
  }, [isInProject, adoptedProposalsFromProps, adoptedProposals]);

  const adoptedAsTasks = useMemo(
    () =>
      effectiveAdoptedProposals.map((p) => ({
        id: p.taskId != null && p.taskId !== "" ? p.taskId : p.key,
        who: "",
        action: p.title,
        risk_id: p.riskId,
      })),
    [effectiveAdoptedProposals],
  );

  /** 対策ToDoリスト用: 採用提案由来 + 地図To-Do をマージ（地図To-Doは risk_id なし） */
  const tasksForList = useMemo(() => {
    const mapTodoTasks = (mapTodos ?? []).map((t) => ({
      id: t.taskId,
      who: "",
      action: t.title,
      risk_id: undefined as string | undefined,
    }));
    return [...adoptedAsTasks, ...mapTodoTasks];
  }, [adoptedAsTasks, mapTodos]);

  const handleAdoptProposal = useCallback(
    (proposal: NextActionProposal) => {
      try {
        if (!proposal?.key) return;
        const snapshot: AdoptedProposalSnapshot = {
          key: proposal.key,
          title: proposal.title,
          taskId: proposal.taskId,
          riskId: proposal.riskId,
        };
        if (isInProject && onAdoptedProposal) {
          onAdoptedProposal(snapshot);
          return;
        }
        setAdoptedProposals((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((e) => e?.key === proposal.key)) return list;
          return [...list, proposal];
        });
      } catch (e) {
        console.error("[FlowGuard] handleAdoptProposal", e);
      }
    },
    [isInProject, onAdoptedProposal],
  );

  const handleRiskDecision = useCallback(
    (riskId: string, decision: "adopted" | "rejected" | "deferred", reason?: string) => {
      try {
        if (!riskId) return;
        const at = new Date().toISOString();
        const risk = data.risks.find((r) => r.id === riskId);
        const title = (risk && "title" in risk && typeof risk.title === "string" ? riskTitleOnly(risk.title) : null) ?? String(riskId);
        setRiskDecisions((prev) => ({ ...prev, [riskId]: { decision, reason, at } }));
        setDecisionLog((prev) => [...prev, { riskId, title, decision, reason, at }]);
      } catch (_e) {
        // no-op to avoid white screen on any unexpected error
      }
    },
    [data.risks],
  );

  const effectiveTodoChecks = isInProject ? (todoChecks ?? {}) : localTodoChecks;
  const handleTodoCheckEffective = useCallback(
    (taskId: string, checked: boolean) => {
      if (isInProject && onTodoCheck) {
        onTodoCheck(taskId, checked);
      } else {
        setLocalTodoChecks((prev) => ({ ...prev, [taskId]: checked }));
      }
    },
    [isInProject, onTodoCheck],
  );

  const handleProposalDecision = useCallback(
    (key: string, decision: "adopted" | "rejected" | "deferred") => {
      try {
        const entry: ProposalDecisionEntry = { key, decision, at: new Date().toISOString() };
        if (isInProject && onProposalDecision) {
          onProposalDecision(entry);
          return;
        }
        setProposalDecisionLog((prev) => {
          const next = Array.isArray(prev) ? [...prev] : [];
          next.push(entry);
          return next;
        });
      } catch (e) {
        console.error("[FlowGuard] handleProposalDecision", e);
      }
    },
    [isInProject, onProposalDecision],
  );

  const eventDateIso = data.date_time?.slice(0, 10) ?? missionConfig?.event_date ?? missionConfig?.date_time?.slice(0, 10) ?? null;

  useEffect(() => {
    setRiskSortKey(ROLE_SORT_DEFAULT[roleFromConfig] ?? "severity");
  }, [roleFromConfig]);

  useEffect(() => {
    if (!isInProject) setAdoptedProposals([]);
  }, [data.simulation_id, isInProject]);

  const handleExportPdf = useCallback(async () => {
    setPdfLoading(true);
    try {
      const delta = computeDeltaSummary(data, effectiveTodoChecks);
      const adoptedForPdf = adoptedAsTasks.map((t) => ({
        id: t.id,
        who: t.who,
        action: t.action,
        risk_id: t.risk_id,
      }));
      const pinsForPdf = (pins ?? []).map((pin) => ({
        id: pin.id,
        name: pin.name,
        memo: pin.memo,
        type: pin.type,
      }));
      const blob = await downloadReportPdf(
        data,
        pdfVariant,
        delta,
        siteCheckMemos,
        effectiveTodoChecks,
        adoptedForPdf.length > 0 ? adoptedForPdf : undefined,
        pinsForPdf.length > 0 ? pinsForPdf : undefined,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const simId = (data.simulation_id || "").slice(0, 8) || "report";
      a.download = `FlowGuard_Report_${(data.event_name || "Report").replace(/\s+/g, "_").slice(0, 30)}_${simId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      window.alert(message);
    } finally {
      setPdfLoading(false);
    }
  }, [data, pdfVariant, effectiveTodoChecks, siteCheckMemos, adoptedAsTasks, pins]);

  const handleToggleCategory = useCallback((cat: RiskCategory) => {
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }, []);

  const handleSelectRisk = useCallback((id: string) => {
    setSelectedRiskId((prev) => (prev === id ? null : id));
  }, []);

  const handlePinSelect = useCallback((p: MapPin) => {
    setSelectedPin(p);
    setPinDetailEditMode(false);
  }, []);

  const handleMapClickForPin = useCallback((lat: number, lng: number) => {
    setPendingPin({ lat, lng });
  }, []);

  const handleMapClickForMapTodo = useCallback((lat: number, lng: number) => {
    setPendingMapTodo({ lat, lng });
    setNewMapTodoTitle("");
  }, []);

  const handleSaveMapTodo = useCallback(async () => {
    if (!pendingMapTodo || !addMapTodo) return;
    const title = newMapTodoTitle.trim() || "";
    if (!title) return;
    setMapTodoSaving(true);
    try {
      await addMapTodo({ lat: pendingMapTodo.lat, lng: pendingMapTodo.lng, title });
      setPendingMapTodo(null);
      setNewMapTodoTitle("");
      setMapTodoAddMode(false);
    } catch (e) {
      console.error("[FlowGuard] addMapTodo", e);
    } finally {
      setMapTodoSaving(false);
    }
  }, [pendingMapTodo, newMapTodoTitle, addMapTodo]);

  const selectedRisk = useMemo(
    () => data.risks.find((r) => r.id === selectedRiskId) ?? null,
    [data.risks, selectedRiskId],
  );

  /** 解決したリスク＝そのリスクに紐づく対策ToDoがすべて完了しているもの */
  const resolvedRiskIds = useMemo(() => {
    const set = new Set<string>();
    for (const risk of data.risks) {
      const tasksForThisRisk = tasksForList.filter((t) => t.risk_id === risk.id);
      if (tasksForThisRisk.length === 0) continue;
      const allChecked = tasksForThisRisk.every((t) => effectiveTodoChecks[t.id] === true);
      if (allChecked) set.add(risk.id);
    }
    return set;
  }, [data.risks, tasksForList, effectiveTodoChecks]);

  const visibleRisks = useMemo(() => {
    let list = data.risks.filter((r) => visibleCategories.has(r.category));
    if (hideResolvedRisks) list = list.filter((r) => !resolvedRiskIds.has(r.id));
    const key = riskSortKey;
    const score = (r: RiskItem) =>
      key === "severity" ? r.severity
      : key === "importance" ? (r.importance ?? r.severity)
      : key === "urgency" ? (r.urgency ?? r.severity)
      : (r.execution_difficulty ?? 5);
    list = [...list].sort((a, b) => score(b) - score(a));
    return list;
  }, [data.risks, visibleCategories, riskSortKey, hideResolvedRisks, resolvedRiskIds]);

  const pinTypeLabel = (type: string | undefined) => getPinTypeLabel(type, t.pins);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Top bar */}
      <Paper
        elevation={0}
        sx={{
          px: 2.5,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: "divider",
          flexShrink: 0,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h6">{data.event_name}</Typography>
          <Chip
            label={t.dashboard.risksIdentified(data.risks.length)}
            size="small"
            color="error"
            variant="outlined"
          />
          {data.weather_used && (
            <Chip
              size="small"
              variant="outlined"
              sx={{ borderColor: "info.main", color: "text.primary" }}
              label={
                [
                  t.dashboard.weatherLabel,
                  (t.weatherConditions[
                    (data.weather_used.weather_condition || "").toLowerCase()
                  ] as string | undefined) ?? data.weather_used.weather_condition ?? "—",
                  `${t.dashboard.weatherTempLabel} ${data.weather_used.temperature_celsius}${t.dashboard.weatherTempUnit}`,
                  `${t.dashboard.weatherPrecipLabel} ${data.weather_used.precipitation_probability}%`,
                ]
                  .filter(Boolean)
                  .join(" ")
              }
            />
          )}
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, val) => {
              if (val == null) return;
              setViewMode(val);
              if (val === "3d") {
                setPinAddMode(false);
                if (mapTypeId === "roadmap" || mapTypeId === "roadmap_no_labels") setMapTypeId("satellite");
              }
            }}
            size="small"
            sx={{ mr: 1 }}
          >
            <ToggleButton value="2d" aria-label="2D">
              <MapIcon sx={{ mr: 0.5 }} /> {t.dashboard.view2D}
            </ToggleButton>
            <ToggleButton value="3d" aria-label="3D">
              <ViewInArIcon sx={{ mr: 0.5 }} /> {t.dashboard.view3D}
            </ToggleButton>
          </ToggleButtonGroup>
          {isInProject && viewMode === "2d" && (
            <>
              <ToggleButton
                value="pin"
                selected={pinAddMode}
                onClick={() => { setPinAddMode((prev) => !prev); setMapTodoAddMode(false); }}
                size="small"
                aria-label={t.dashboard.pinAdd}
              >
                <PlaceIcon sx={{ mr: 0.5 }} /> {t.dashboard.pinAdd}
              </ToggleButton>
              <ToggleButton
                value="mapTodo"
                selected={mapTodoAddMode}
                onClick={() => { setMapTodoAddMode((prev) => !prev); setPinAddMode(false); }}
                size="small"
                aria-label={t.dashboard.mapTodoAdd}
              >
                <AssignmentIcon sx={{ mr: 0.5 }} /> {t.dashboard.mapTodoAdd}
              </ToggleButton>
            </>
          )}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>PDF</InputLabel>
            <Select
              value={pdfVariant}
              label="PDF"
              onChange={(e) => setPdfVariant(e.target.value)}
            >
              <MenuItem value="full">{t.dashboardExtra.pdfFull}</MenuItem>
              <MenuItem value="one_page">{t.dashboardExtra.pdfOnePage}</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            size="small"
            startIcon={<PictureAsPdfIcon />}
            onClick={handleExportPdf}
            disabled={pdfLoading}
          >
            {t.dashboard.exportPdf}
          </Button>
        </Stack>
      </Paper>

      {/* Main content: 左・中央・右（左右はドラッグでリサイズ可能） */}
      <Box sx={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden", userSelect: resizeState ? "none" : undefined }}>
        {/* 左: レイヤー＋リスク一覧 */}
        <Paper
          elevation={0}
          sx={{
            width: leftPanelWidth,
            flexShrink: 0,
            borderRight: "1px solid",
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          <RiskLayerControl
            visibleCategories={visibleCategories}
            onToggleCategory={handleToggleCategory}
            riskCountByCategory={data.risk_count_by_category}
            overallScore={data.overall_risk_score ?? 0}
            overallScoreAfter={computeDeltaSummary(data, effectiveTodoChecks).riskScoreAfter}
          />
          <Divider />
          <FormControl size="small" fullWidth sx={{ px: 2, pt: 1 }}>
            <InputLabel>{t.dashboard.sortLabel}</InputLabel>
            <Select
              value={riskSortKey}
              label={t.dashboard.sortLabel}
              onChange={(e) => setRiskSortKey(e.target.value as RiskSortKey)}
            >
              <MenuItem value="severity">{t.dashboard.sortBySeverity}</MenuItem>
              <MenuItem value="importance">{t.dashboard.sortByImportance}</MenuItem>
              <MenuItem value="urgency">{t.dashboard.sortByUrgency}</MenuItem>
              <MenuItem value="execution_difficulty">{t.dashboard.sortByExecutionDifficulty}</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={hideResolvedRisks}
                onChange={(_, checked) => setHideResolvedRisks(checked)}
              />
            }
            label={t.dashboard.hideResolvedRisks}
            sx={{ px: 2, pt: 1, pb: 0 }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              textTransform: "uppercase",
              letterSpacing: 1,
              display: "block",
              px: 2,
              pt: 1.5,
              pb: 0.5,
            }}
          >
            {t.dashboard.riskItems(visibleRisks.length)}
          </Typography>
          {visibleRisks.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
              {t.dashboardExtra.noRisksMessage}
            </Typography>
          )}
          <List dense disablePadding sx={{ pb: 2 }}>
            {visibleRisks.map((risk) => (
              <RiskListItem
                key={risk.id}
                risk={risk}
                selected={risk.id === selectedRiskId}
                onClick={() => handleSelectRisk(risk.id)}
              />
            ))}
          </List>
        </Paper>

        {/* 左リサイズハンドル */}
        <Box
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            setResizeState({ side: "left", startX: e.clientX, startWidth: leftPanelWidth });
          }}
          sx={{
            width: 6,
            flexShrink: 0,
            cursor: "col-resize",
            borderLeft: "1px solid",
            borderRight: "1px solid",
            borderColor: "divider",
            bgcolor: resizeState?.side === "left" ? "action.selected" : "action.hover",
            "&:hover": { bgcolor: "action.selected" },
          }}
          aria-label="左パネル幅を変更"
          role="separator"
        />

        {/* 中央: マップ ＋ 地図表示・交通凡例オーバーレイ */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {pinAddMode && viewMode === "2d" && (
            <Paper
              elevation={0}
              sx={{
                position: "absolute",
                top: 10,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 20,
                px: 2,
                py: 1,
                borderRadius: 2,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                boxShadow: "0 2px 12px rgba(0, 122, 255, 0.35)",
              }}
            >
              <Typography variant="body2" fontWeight={600}>
                {t.dashboard.pinAddModeBanner}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                sx={{ mt: 0.5, color: "inherit", borderColor: "currentColor" }}
                onClick={() => setPinAddMode(false)}
              >
                {t.dashboard.pinAddModeOff}
              </Button>
            </Paper>
          )}
          {mapTodoAddMode && viewMode === "2d" && (
            <Paper
              elevation={0}
              sx={{
                position: "absolute",
                top: 10,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 20,
                px: 2,
                py: 1,
                borderRadius: 2,
                bgcolor: "warning.main",
                color: "warning.contrastText",
                boxShadow: "0 2px 12px rgba(255, 149, 0, 0.35)",
              }}
            >
              <Typography variant="body2" fontWeight={600}>
                {t.dashboard.mapTodoAddModeBanner}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                sx={{ mt: 0.5, color: "inherit", borderColor: "currentColor" }}
                onClick={() => setMapTodoAddMode(false)}
              >
                {t.dashboard.mapTodoAddModeOff}
              </Button>
            </Paper>
          )}
          {viewMode === "2d" && (
            <MapView
              apiKey={apiKey}
              risks={data.risks}
              visibleCategories={visibleCategories}
              selectedRiskId={selectedRiskId}
              onSelectRisk={handleSelectRisk}
              polygon={polygon}
              mapTypeId={mapTypeId}
              pins={pins}
              pinAddMode={pinAddMode}
              onMapClickForPin={pinAddMode && isInProject ? handleMapClickForPin : undefined}
              onPinSelect={handlePinSelect}
              mapTodos={mapTodos}
              todoChecks={effectiveTodoChecks}
              mapTodoAddMode={mapTodoAddMode}
              onMapClickForMapTodo={mapTodoAddMode && isInProject ? handleMapClickForMapTodo : undefined}
              onDeleteMapTodo={isInProject ? deleteMapTodo : undefined}
              deleteMapTodoLabel={t.pins.delete}
            />
          )}
          {viewMode === "3d" && (
            <Cesium3DView
              apiKey={apiKey}
              polygon={polygon}
              risks={data.risks}
              visibleCategories={visibleCategories}
            />
          )}
          <MapControlsOverlay
            viewMode={viewMode}
            mapTypeId={mapTypeId}
            onMapTypeChange={setMapTypeId}
            showTrafficLegend={visibleCategories.has(RiskCategory.TRAFFIC_LOGISTICS)}
            eventDateTime={data.date_time}
          />
        </Box>

        {/* 右リサイズハンドル */}
        <Box
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            setResizeState({ side: "right", startX: e.clientX, startWidth: rightPanelWidth });
          }}
          sx={{
            width: 6,
            flexShrink: 0,
            cursor: "col-resize",
            borderLeft: "1px solid",
            borderRight: "1px solid",
            borderColor: "divider",
            bgcolor: resizeState?.side === "right" ? "action.selected" : "action.hover",
            "&:hover": { bgcolor: "action.selected" },
          }}
          aria-label="右パネル幅を変更"
          role="separator"
        />

        {/* 右: 詳細パネル（タブで分析 / ToDo・比較・メモ を切り替え） */}
        <Paper
          elevation={0}
          sx={{
            width: rightPanelWidth,
            flexShrink: 0,
            borderLeft: "1px solid",
            borderColor: "divider",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Tabs
            value={rightPanelTab}
            onChange={(_, v) => setRightPanelTab(typeof v === "number" ? v : 0)}
            variant="fullWidth"
            sx={{ minHeight: 40, borderBottom: "1px solid", borderColor: "divider", flexShrink: 0 }}
          >
            <Tab label={t.dashboard.tabAnalysis} id="right-tab-0" aria-controls="right-panel-0" />
            <Tab label={t.dashboard.tabMeasuresActions} id="right-tab-1" aria-controls="right-panel-1" />
            <Tab label={t.dashboard.tabTodoCompare} id="right-tab-2" aria-controls="right-panel-2" />
          </Tabs>
          <RightPanelErrorBoundary>
          <Box id="right-panel-0" role="tabpanel" hidden={rightPanelTab !== 0} sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <RiskDetailPanel
              data={data}
              selectedRisk={selectedRisk}
              riskFactorBreakdowns={data.risk_factor_breakdowns}
              riskDecisions={riskDecisions}
              onRiskDecision={handleRiskDecision}
              decisionLog={decisionLog}
              todoChecks={effectiveTodoChecks}
              eventDateIso={eventDateIso}
              proposalDecisionLog={effectiveProposalDecisionLog}
              onProposalDecision={handleProposalDecision}
              onAdoptProposal={handleAdoptProposal}
              onShowMeasuresPanel={() => setRightPanelTab(1)}
              adoptedTasks={tasksForList.map((t) => ({ id: t.id, risk_id: t.risk_id }))}
            />
          </Box>
          <Box id="right-panel-1" role="tabpanel" hidden={rightPanelTab !== 1} sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <MeasuresAndNextActionsPanel
              data={data}
              todoChecks={effectiveTodoChecks}
              adoptedTasks={tasksForList.map((t) => ({ id: t.id, risk_id: t.risk_id }))}
              eventDateIso={eventDateIso}
              proposalDecisionLog={effectiveProposalDecisionLog}
              onProposalDecision={handleProposalDecision}
              onAdoptProposal={handleAdoptProposal}
            />
          </Box>
          <Box id="right-panel-2" role="tabpanel" hidden={rightPanelTab !== 2} sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <MitigationTodoList
              tasks={tasksForList}
              risks={data.risks}
              eventDateTime={data.date_time ?? missionConfig?.date_time}
              todoChecks={effectiveTodoChecks}
              onToggle={handleTodoCheckEffective}
              todoAssignees={isInProject ? todoAssignees : undefined}
              onAssigneeChange={isInProject ? onTodoAssignee : undefined}
              todoAssigneeOther={isInProject ? todoAssigneeOther : undefined}
              onAssigneeOtherChange={isInProject ? onTodoAssigneeOther : undefined}
              todoOnSiteChecks={isInProject ? todoOnSiteChecks : undefined}
              onOnSiteCheck={isInProject ? onTodoOnSiteCheck : undefined}
              defaultExpanded={true}
              focusedRiskId={focusedTodoRiskId}
              onFocusedRiskConsumed={() => setFocusedTodoRiskId(null)}
            />
            {onRunAndAddCase && onAdoptCase && (
              <WhatIfCompare
                currentResult={data}
                cases={whatIfCases}
                onRunAndAddCase={onRunAndAddCase}
                onAdoptCase={onAdoptCase}
                loading={whatIfLoading}
                currentConfig={missionConfig ?? null}
                locale={locale}
              />
            )}
            {onSiteCheckMemosChange && (
              <SiteCheckMemo
                items={siteCheckMemos}
                onChange={onSiteCheckMemosChange}
                tasks={tasksForList}
                defaultExpanded={false}
              />
            )}
          </Box>
          </RightPanelErrorBoundary>
        </Paper>
      </Box>

      {/* ピン追加: メモ・種別入力ダイアログ */}
      <Dialog open={pendingPin != null} onClose={() => setPendingPin(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t.dashboard.pinAdd}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            autoFocus
            label={t.pins.nameLabel}
            placeholder={t.pins.namePlaceholder}
            value={newPinName}
            onChange={(e) => setNewPinName(e.target.value)}
            fullWidth
            required
            sx={{ mb: 2 }}
          />
          <TextField
            label={t.pins.memoLabel}
            placeholder={t.pins.memoPlaceholder}
            value={newPinMemo}
            onChange={(e) => setNewPinMemo(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth size="small" required>
            <InputLabel>{t.pins.typeLabel}</InputLabel>
            <Select
              value={newPinType}
              label={t.pins.typeLabel}
              onChange={(e) => setNewPinType(e.target.value)}
            >
              {PIN_TYPE_IDS.map((id) => (
                <MenuItem key={id} value={id}>
                  {getPinTypeLabel(id, t.pins)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setPendingPin(null); setNewPinName(""); setNewPinMemo(""); setNewPinType("other"); }}>
            {t.pins.cancel}
          </Button>
          <Button
            variant="contained"
            disabled={!newPinName.trim() || pinSaving}
            onClick={async () => {
              if (!pendingPin || !addPin || !newPinName.trim()) return;
              setPinSaving(true);
              try {
                await addPin({
                  lat: pendingPin.lat,
                  lng: pendingPin.lng,
                  name: newPinName.trim(),
                  memo: newPinMemo.trim() || undefined,
                  type: newPinType,
                });
                setPendingPin(null);
                setNewPinName("");
                setNewPinMemo("");
                setNewPinType("other");
              } finally {
                setPinSaving(false);
              }
            }}
          >
            {t.pins.save}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 地図To-Do追加: タイトル入力ダイアログ */}
      <Dialog open={pendingMapTodo != null} onClose={() => setPendingMapTodo(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t.dashboard.mapTodoAdd}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            autoFocus
            label={t.dashboard.mapTodoTitleLabel}
            placeholder={t.dashboard.mapTodoTitlePlaceholder}
            value={newMapTodoTitle}
            onChange={(e) => setNewMapTodoTitle(e.target.value)}
            fullWidth
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setPendingMapTodo(null); setNewMapTodoTitle(""); }}>
            {t.pins.cancel}
          </Button>
          <Button
            variant="contained"
            disabled={!newMapTodoTitle.trim() || mapTodoSaving}
            onClick={handleSaveMapTodo}
          >
            {t.pins.save}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ピン詳細・編集・削除ダイアログ */}
      <Dialog
        open={selectedPin != null}
        onClose={() => { setSelectedPin(null); setPinDetailEditMode(false); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t.pins.detailTitle}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {selectedPin && (
            pinDetailEditMode ? (
              <>
                <TextField
                  autoFocus
                  label={t.pins.nameLabel}
                  value={pinEditName}
                  onChange={(e) => setPinEditName(e.target.value)}
                  fullWidth
                  required
                  sx={{ mb: 2 }}
                />
                <TextField
                  label={t.pins.memoLabel}
                  placeholder={t.pins.memoPlaceholder}
                  value={pinEditMemo}
                  onChange={(e) => setPinEditMemo(e.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                  sx={{ mb: 2 }}
                />
                <FormControl fullWidth size="small" required>
                  <InputLabel>{t.pins.typeLabel}</InputLabel>
                  <Select
                    value={pinEditType}
                    label={t.pins.typeLabel}
                    onChange={(e) => setPinEditType(e.target.value)}
                  >
                    {PIN_TYPE_IDS.map((id) => (
                      <MenuItem key={id} value={id}>
                        {getPinTypeLabel(id, t.pins)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            ) : (
              <Stack spacing={1}>
                <Typography variant="body2"><strong>{t.pins.nameLabel}:</strong> {selectedPin.name || "—"}</Typography>
                {selectedPin.memo != null && selectedPin.memo !== "" && (
                  <Typography variant="body2"><strong>{t.pins.memoLabel}:</strong> {selectedPin.memo}</Typography>
                )}
                <Typography variant="body2"><strong>{t.pins.typeLabel}:</strong> {pinTypeLabel(selectedPin.type)}</Typography>
                {selectedPin.createdBy && (
                  <Typography variant="caption" color="text.secondary">{t.pins.createdBy}: {selectedPin.createdBy.slice(0, 8)}…</Typography>
                )}
                {(selectedPin.updatedAt || selectedPin.createdAt) && (
                  <Typography variant="caption" color="text.secondary">
                    {t.pins.updatedAt}: {new Date(selectedPin.updatedAt || selectedPin.createdAt).toLocaleString()}
                  </Typography>
                )}
              </Stack>
            )
          )}
        </DialogContent>
        <DialogActions>
          {selectedPin && (
            pinDetailEditMode ? (
              <>
                <Button onClick={() => setPinDetailEditMode(false)}>{t.pins.cancel}</Button>
                <Button
                  variant="contained"
                  disabled={pinSaving}
                  onClick={async () => {
                    if (!updatePin) return;
                    setPinSaving(true);
                    try {
                      await updatePin(selectedPin.id, { name: pinEditName.trim(), memo: pinEditMemo.trim() || undefined, type: pinEditType });
                      setSelectedPin(null);
                      setPinDetailEditMode(false);
                    } finally {
                      setPinSaving(false);
                    }
                  }}
                >
                  {t.pins.save}
                </Button>
              </>
            ) : (
              <>
                <Button color="error" onClick={async () => {
                  if (!deletePin || !selectedPin) return;
                  if (!window.confirm(t.pins.deleteConfirm)) return;
                  await deletePin(selectedPin.id);
                  setSelectedPin(null);
                }}>
                  {t.pins.delete}
                </Button>
                <Button variant="contained" onClick={() => {
                  setPinEditName(selectedPin.name ?? "");
                  setPinEditMemo(selectedPin.memo ?? "");
                  setPinEditType(selectedPin.type ?? "other");
                  setPinDetailEditMode(true);
                }}>
                  {t.pins.edit}
                </Button>
                <Button onClick={() => setSelectedPin(null)}>{t.pins.cancel}</Button>
              </>
            )
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function RiskListItem({
  risk,
  selected,
  onClick,
}: {
  risk: RiskItem;
  selected: boolean;
  onClick: () => void;
}) {
  const { t } = useLanguage();
  const color = RISK_CATEGORY_COLORS[risk.category];
  const catLabel = t.riskCategories[risk.category] ?? risk.category;

  return (
    <ListItemButton
      selected={selected}
      onClick={onClick}
      sx={{
        py: 1,
        px: 2,
        borderRadius: 0,
        margin: 0,
        borderLeft: `3px solid ${color}`,
        "&.Mui-selected": {
          bgcolor: `${color}14`,
          borderLeftColor: color,
        },
      }}
    >
      <ListItemText
        primary={riskTitleOnly(risk.title)}
        secondary={
          risk.category === RiskCategory.LEGAL_COMPLIANCE
            ? `${t.detail.severity}: ${risk.severity.toFixed(1)}`
            : `${t.detail.severity}: ${risk.severity.toFixed(1)} | ${t.detail.probability}: ${(risk.probability * 100).toFixed(0)}%`
        }
        primaryTypographyProps={{
          variant: "body2",
          fontWeight: 600,
          noWrap: true,
        }}
        secondaryTypographyProps={{ variant: "caption" }}
      />
      <Chip
        label={catLabel.split(/[・&]/)[0]}
        size="small"
        sx={{
          ml: 0.5,
          height: 20,
          fontSize: "0.6rem",
          bgcolor: `${color}22`,
          color,
          fontWeight: 600,
        }}
      />
    </ListItemButton>
  );
}
