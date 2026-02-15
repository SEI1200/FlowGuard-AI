import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Fade from "@mui/material/Fade";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import SecurityIcon from "@mui/icons-material/Security";
import SettingsIcon from "@mui/icons-material/Settings";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";

import type { LatLng, MissionConfig, SimulationResponse } from "./types";
import type { WhatIfCase } from "./types/whatIf";
import type { SiteCheckItem } from "./types/siteCheck";
import { getDefaultSiteCheckItems } from "./types/siteCheck";
import { useRiskSimulation } from "./hooks/useRiskSimulation";
import {
  buildSimulationRequest,
  runSimulation,
  translateSimulationResponse,
  getReportText,
  type AssistContext,
} from "./services/api";
import { computeNextActionProposals } from "./utils/nextActionProposals";
import { computeDeltaSummary } from "./utils/mitigationDelta";
import { useLanguage } from "./i18n/LanguageContext";
import { useProject } from "./context/ProjectContext";
import type { Locale } from "./i18n/translations";

import LandingScreen from "./components/LandingScreen";
import MissionSetup from "./components/MissionSetup";
import AreaDesignation from "./components/AreaDesignation";
import RiskDashboard from "./components/RiskDashboard";
import SettingsDialog from "./components/SettingsDialog";
import AssistFab from "./components/AssistFab";

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

export default function App() {
  const { locale, setLocale, t } = useLanguage();
  const {
    joinCode,
    projectData,
    firebaseReady,
    createProject,
    joinProject,
    leaveProject,
    saveMissionConfig,
    savePolygon,
    saveSimulationResult,
    todoChecks,
    setTodoCheck,
    todoAssignees,
    setTodoAssignee,
    todoAssigneeOther,
    setTodoAssigneeOther,
    todoOnSiteChecks,
    setTodoOnSiteCheck,
    proposalDecisionLog,
    adoptedProposals,
    addProposalDecision,
    addAdoptedProposal,
    pins,
    addPin,
    updatePin,
    deletePin,
    mapTodos,
    addMapTodo,
    deleteMapTodo,
    isInProject,
  } = useProject();

  const showMainFlow = isInProject;

  const [activeStep, setActiveStep] = useState(0);
  const [missionConfig, setMissionConfig] = useState<MissionConfig | null>(null);
  const [polygon, setPolygon] = useState<LatLng[]>([]);
  const [completionPhase, setCompletionPhase] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const restoredRef = useRef(false);
  const [whatIfCases, setWhatIfCases] = useState<WhatIfCase[]>([]);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [adoptedWhatIfResult, setAdoptedWhatIfResult] = useState<SimulationResponse | null>(null);
  const [siteCheckMemos, setSiteCheckMemos] = useState<SiteCheckItem[]>(() => getDefaultSiteCheckItems());
  const [translatedResult, setTranslatedResult] = useState<SimulationResponse | null>(null);
  const [translatedForId, setTranslatedForId] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [reportText, setReportText] = useState<string | null>(null);

  const { result, loading, error, simulate, reset: resetSimulation } = useRiskSimulation();

  // プロジェクト（参加コード）が変わったら What-if はそのプロジェクト専用にするためクリア
  useEffect(() => {
    setWhatIfCases([]);
    setAdoptedWhatIfResult(null);
  }, [joinCode]);

  // 参加時にプロジェクトの状態を復元
  useEffect(() => {
    if (!showMainFlow || !projectData || restoredRef.current) return;
    restoredRef.current = true;
    if (projectData.missionConfig) setMissionConfig(projectData.missionConfig);
    if (projectData.polygon?.length) setPolygon(projectData.polygon);
    if (projectData.simulationResult) setActiveStep(2);
  }, [showMainFlow, projectData]);

  const effectiveResult: SimulationResponse | null = adoptedWhatIfResult ?? result ?? projectData?.simulationResult ?? null;
  const effectivePolygon = polygon.length > 0 ? polygon : (projectData?.polygon ?? []);

  useEffect(() => {
    if (locale !== "en") {
      setTranslatedResult(null);
      setTranslatedForId(null);
      return;
    }
    if (!effectiveResult?.simulation_id) return;
    if (translatedForId === effectiveResult.simulation_id) return;
    setTranslating(true);
    translateSimulationResponse(effectiveResult)
      .then((translated) => {
        setTranslatedResult(translated);
        setTranslatedForId(effectiveResult!.simulation_id);
      })
      .catch(() => {
        setTranslatedResult(null);
        setTranslatedForId(null);
      })
      .finally(() => setTranslating(false));
  }, [locale, effectiveResult?.simulation_id]);

  const displayResult: SimulationResponse | null =
    locale === "en" && translatedResult && effectiveResult && translatedForId === effectiveResult.simulation_id
      ? translatedResult
      : effectiveResult;

  const eventDateIso = missionConfig?.event_date ? `${missionConfig.event_date}T00:00:00` : undefined;
  const nextActionProposals = useMemo(
    () =>
      displayResult && todoChecks
        ? computeNextActionProposals(
            displayResult,
            todoChecks,
            eventDateIso ?? null,
            proposalDecisionLog ?? [],
            t?.proposals,
          )
        : [],
    [displayResult, todoChecks, eventDateIso, proposalDecisionLog, t?.proposals],
  );

  useEffect(() => {
    if (activeStep !== 2 || !displayResult?.simulation_id) {
      setReportText(null);
      return;
    }
    const adoptedTasks = (adoptedProposals ?? []).map((p) => ({
      id: p.taskId ?? p.key,
      risk_id: p.riskId,
    }));
    const adoptedForPdf = (adoptedProposals ?? []).map((p) => ({
      id: p.taskId ?? p.key,
      who: "",
      action: p.title,
      risk_id: p.riskId,
    }));
    const delta = computeDeltaSummary(displayResult, todoChecks, adoptedTasks.length > 0 ? adoptedTasks : undefined);
    getReportText(
      displayResult,
      delta,
      siteCheckMemos?.length ? siteCheckMemos : undefined,
      todoChecks,
      adoptedForPdf.length > 0 ? adoptedForPdf : undefined,
      pins.length > 0 ? pins : undefined,
    )
      .then(setReportText)
      .catch(() => setReportText(null));
  }, [
    activeStep,
    displayResult?.simulation_id,
    displayResult,
    todoChecks,
    siteCheckMemos,
    adoptedProposals,
    pins,
  ]);

  const assistContext = useMemo((): AssistContext | undefined => {
    if (!showMainFlow) return undefined;
    const todo_total_count = displayResult?.mitigation_tasks?.length ?? 0;
    const todo_checked_count =
      displayResult?.mitigation_tasks?.filter((m) => todoChecks[m.id]).length ?? 0;
    const risks = displayResult?.risks
      ? [...displayResult.risks]
          .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0))
          .slice(0, 20)
          .map((r) => ({
            title: r.title,
            severity: r.severity ?? 0,
            importance: r.importance,
            urgency: r.urgency,
            execution_difficulty: r.execution_difficulty,
            description: r.description?.slice(0, 300),
            mitigation_actions: r.mitigation_actions?.slice(0, 5),
          }))
      : undefined;
    const todos = displayResult?.mitigation_tasks?.map((m) => ({
      action: m.action,
      who: m.who,
      checked: Boolean(todoChecks[m.id]),
    }));
    return {
      step: activeStep,
      event_name: missionConfig?.event_name ?? displayResult?.event_name,
      risk_count: displayResult?.risks?.length,
      overall_risk_score: displayResult?.overall_risk_score,
      summary: displayResult?.summary,
      recommendations: displayResult?.recommendations?.slice(0, 15),
      risks,
      todos,
      next_action_proposals: nextActionProposals.length > 0
        ? nextActionProposals.map((p) => ({ title: p.title, reason: p.reason, source: p.source }))
        : undefined,
      report_text: reportText ?? undefined,
      todo_checked_count: todo_total_count > 0 ? todo_checked_count : undefined,
      todo_total_count: todo_total_count > 0 ? todo_total_count : undefined,
      pins_count: pins.length,
      map_todos_count: mapTodos.length,
    };
  }, [
    showMainFlow,
    activeStep,
    missionConfig?.event_name,
    missionConfig?.event_date,
    displayResult,
    todoChecks,
    proposalDecisionLog,
    nextActionProposals,
    reportText,
    pins.length,
    mapTodos.length,
  ]);

  useEffect(() => {
    if (loading) setCompletionPhase(false);
    if (result && !loading) {
      setCompletionPhase(true);
      if (isInProject) saveSimulationResult(result);
      const id = setTimeout(() => setCompletionPhase(false), 500);
      return () => clearTimeout(id);
    }
  }, [result, loading, isInProject, saveSimulationResult]);

  const steps = [t.steps.eventConfig, t.steps.areaDesignation, t.steps.riskAnalysis];

  const handleMissionComplete = useCallback(
    (config: MissionConfig) => {
      setMissionConfig(config);
      setActiveStep(1);
      if (isInProject) saveMissionConfig(config);
    },
    [isInProject, saveMissionConfig]
  );

  const handleAreaComplete = useCallback(
    async (poly: LatLng[]) => {
      setPolygon(poly);
      setActiveStep(2);
      if (isInProject) savePolygon(poly);
      if (missionConfig) await simulate(missionConfig, poly, locale);
    },
    [missionConfig, simulate, locale, isInProject, savePolygon]
  );

  const handleBackToSetup = useCallback(() => setActiveStep(0), []);

  const handleReset = useCallback(() => {
    setActiveStep(0);
    setMissionConfig(null);
    setPolygon([]);
    setWhatIfCases([]);
    setAdoptedWhatIfResult(null);
    setSiteCheckMemos(getDefaultSiteCheckItems());
    resetSimulation();
    restoredRef.current = false;
  }, [resetSimulation]);

  const handleRunAndAddCase = useCallback(
    async (config: MissionConfig, label: string) => {
      if (effectivePolygon.length < 3) throw new Error(t.error.areaNotSpecified);
      setWhatIfLoading(true);
      try {
        const req = buildSimulationRequest(config, effectivePolygon, locale);
        const res = await runSimulation(req);
        setWhatIfCases((prev) => [
          ...prev,
          {
            id: crypto.randomUUID?.() ?? String(Date.now()),
            label,
            config,
            polygon: effectivePolygon,
            result: res,
            createdAt: new Date().toISOString(),
          },
        ]);
      } finally {
        setWhatIfLoading(false);
      }
    },
    [effectivePolygon, locale],
  );

  const handleAdoptCase = useCallback((simResult: SimulationResponse) => {
    setAdoptedWhatIfResult(simResult);
  }, []);

  const handleLeaveProject = useCallback(() => {
    leaveProject();
    setActiveStep(0);
    setMissionConfig(null);
    setPolygon([]);
    resetSimulation();
    restoredRef.current = false;
  }, [leaveProject, resetSimulation]);

  const displayStep = useMemo(() => {
    if (activeStep === 2 && (result || projectData?.simulationResult)) return 2;
    if (activeStep === 2 && loading) return 2;
    return activeStep;
  }, [activeStep, result, loading, projectData?.simulationResult]);

  const handleLocaleChange = (_: React.MouseEvent<HTMLElement>, val: string | null) => {
    if (val) setLocale(val as Locale);
  };

  const copyJoinCode = useCallback(() => {
    if (!joinCode) return;
    navigator.clipboard.writeText(joinCode);
  }, [joinCode]);

  // ランディング: プロジェクト未選択 かつ ローカルモードでない
  if (!showMainFlow) {
    return (
      <>
        <LandingScreen
          firebaseReady={firebaseReady}
          onCreateProject={createProject}
          onJoinProject={joinProject}
        />
        <AssistFab assistContext={{ step: 0 }} />
      </>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          color: "text.primary",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar variant="dense" sx={{ gap: 1.5 }}>
          <SecurityIcon sx={{ fontSize: 28, color: "primary.main" }} />
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: -0.5, color: "text.primary" }}>
            {t.app.title}
          </Typography>

          {joinCode && (
            <Chip
              label={t.app.joinCodeLabel(joinCode)}
              size="small"
              sx={{
                ml: 1,
                bgcolor: "rgba(0, 122, 255, 0.1)",
                color: "primary.main",
                fontWeight: 600,
                "& .MuiChip-label": { pr: 0.5 },
              }}
            />
          )}
          {joinCode && (
            <IconButton onClick={copyJoinCode} size="small" aria-label={t.app.copyCodeLabel} sx={{ color: "text.secondary" }}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          )}

          {joinCode && (
            <Button
              variant="text"
              size="small"
              startIcon={<ExitToAppIcon />}
              onClick={handleLeaveProject}
              sx={{ ml: 0.5, color: "text.secondary" }}
            >
              {t.app.leaveProject}
            </Button>
          )}

          <Box sx={{ ml: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ position: "relative", display: "inline-flex" }}>
                {translating && (
                  <CircularProgress
                    size={44}
                    thickness={3}
                    sx={{
                      position: "absolute",
                      top: -4,
                      left: -4,
                      color: "primary.main",
                      opacity: 0.6,
                      zIndex: 0,
                    }}
                  />
                )}
                <ToggleButtonGroup
                  value={locale}
                  exclusive
                  onChange={handleLocaleChange}
                  size="small"
                  disabled={translating}
                  sx={{
                    position: "relative",
                    zIndex: 1,
                    bgcolor: "rgba(0,0,0,0.04)",
                    borderRadius: 10,
                    p: 0.25,
                    "& .MuiToggleButton-root": {
                      color: "text.secondary",
                      border: "none",
                      px: 1.5,
                      py: 0.25,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      borderRadius: 8,
                      "&.Mui-selected": { color: "primary.main", bgcolor: "background.paper", boxShadow: "0 1px 2px rgba(0,0,0,0.06)" },
                    },
                  }}
                >
                  <ToggleButton value="ja">JP</ToggleButton>
                  <ToggleButton value="en">EN</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <IconButton onClick={() => setSettingsOpen(true)} sx={{ color: "text.secondary" }} aria-label={t.app.settingsLabel}>
                <SettingsIcon />
              </IconButton>
            </Box>
            {translating && (
              <Typography variant="caption" sx={{ mt: 0.5, alignSelf: "flex-start", color: "text.secondary" }}>
                {t.dashboardExtra.translatingContent}
              </Typography>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {(activeStep < 2 || loading || completionPhase || error) && (
        <Paper elevation={0} sx={{ borderBottom: "1px solid", borderColor: "divider", py: 1.5 }}>
          <Container maxWidth="sm">
            <Stepper activeStep={displayStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Container>
        </Paper>
      )}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: activeStep === 2 && effectiveResult && !completionPhase && !error ? "hidden" : "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {activeStep === 0 && (
          <Fade in>
            <Container maxWidth="md" sx={{ py: 3, flex: 1 }}>
              <MissionSetup
                initialConfig={missionConfig ?? projectData?.missionConfig ?? undefined}
                onComplete={handleMissionComplete}
              />
            </Container>
          </Fade>
        )}

        {activeStep === 1 && (
          <Fade in>
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <AreaDesignation
                apiKey={MAPS_API_KEY}
                locationQuery={missionConfig?.event_location}
                initialPolygon={polygon.length > 0 ? polygon : projectData?.polygon}
                onComplete={handleAreaComplete}
                onBack={handleBackToSetup}
              />
            </Box>
          </Fade>
        )}

        {activeStep === 2 && (loading || completionPhase) && (
          <Fade in>
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, py: 8 }}>
              <SimulationProgress steps={t.loading.steps} completed={completionPhase} completeLabel={t.loading.complete} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {completionPhase ? t.loading.complete : t.loading.title}
              </Typography>
            </Box>
          </Fade>
        )}

        {activeStep === 2 && error && (
          <Fade in>
            <Container maxWidth="sm" sx={{ py: 6 }}>
              <Alert
                severity={
                  error.includes("429") || error.includes("rate limit")
                    ? "warning"
                    : error.toLowerCase().includes("timed out") || error.toLowerCase().includes("timeout")
                      ? "info"
                      : "error"
                }
                sx={{ mb: 2 }}
              >
                {error.includes("429") || error.includes("rate limit")
                  ? t.error.rateLimitHint
                  : error.toLowerCase().includes("timed out") || error.toLowerCase().includes("timeout")
                    ? t.error.timeoutHint
                    : error}
              </Alert>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    if (missionConfig && polygon.length > 0) simulate(missionConfig, polygon, locale);
                  }}
                >
                  {t.error.retryButton}
                </Button>
                <Button variant="outlined" size="small" onClick={handleReset}>
                  {t.error.startOver}
                </Button>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: "center" }}>
                {t.error.nextActionHint}
              </Typography>
            </Container>
          </Fade>
        )}

        {activeStep === 2 && effectiveResult && displayResult && !completionPhase && !loading && (
          <Fade in>
            <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <RiskDashboard
                apiKey={MAPS_API_KEY}
                data={displayResult}
                polygon={effectivePolygon}
                missionConfig={missionConfig ?? projectData?.missionConfig ?? null}
                todoChecks={todoChecks}
                onTodoCheck={setTodoCheck}
                todoAssignees={todoAssignees}
                onTodoAssignee={setTodoAssignee}
                todoAssigneeOther={todoAssigneeOther}
                onTodoAssigneeOther={setTodoAssigneeOther}
                todoOnSiteChecks={todoOnSiteChecks}
                onTodoOnSiteCheck={setTodoOnSiteCheck}
                proposalDecisionLog={proposalDecisionLog}
                adoptedProposals={adoptedProposals}
                onProposalDecision={addProposalDecision}
                onAdoptedProposal={addAdoptedProposal}
                pins={pins}
                addPin={addPin}
                updatePin={updatePin}
                deletePin={deletePin}
                mapTodos={mapTodos}
                addMapTodo={addMapTodo}
                deleteMapTodo={deleteMapTodo}
                isInProject={isInProject}
                whatIfCases={whatIfCases}
                whatIfLoading={whatIfLoading}
                onRunAndAddCase={handleRunAndAddCase}
                onAdoptCase={handleAdoptCase}
                locale={locale}
                siteCheckMemos={siteCheckMemos}
                onSiteCheckMemosChange={setSiteCheckMemos}
              />
            </Box>
          </Fade>
        )}
      </Box>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AssistFab assistContext={assistContext} />
    </Box>
  );
}

function SimulationProgress({
  steps,
  completed = false,
  completeLabel = "Complete",
}: {
  steps: string[];
  completed?: boolean;
  completeLabel?: string;
}) {
  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (completed) {
      setProgress(100);
      setStepIdx(steps.length - 1);
      return;
    }
    let elapsed = 0;
    intervalRef.current = setInterval(() => {
      elapsed += 0.5;
      const pct = Math.min(92, 100 * (1 - Math.exp(-elapsed / 20)));
      setProgress(pct);
      setStepIdx(Math.min(steps.length - 1, Math.floor((pct / 92) * steps.length)));
    }, 500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [steps.length, completed]);

  const displayProgress = completed ? 100 : progress;
  const displayMessage = completed ? completeLabel : steps[stepIdx];

  return (
    <Box sx={{ width: 400, maxWidth: "90%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          {displayMessage}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main", minWidth: 42, textAlign: "right" }}>
          {Math.round(displayProgress)}%
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={displayProgress}
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: "rgba(26,35,126,0.1)",
          "& .MuiLinearProgress-bar": { borderRadius: 4, background: "linear-gradient(90deg, #1A237E 0%, #534bae 100%)", transition: "transform 0.5s ease" },
        }}
      />
    </Box>
  );
}
