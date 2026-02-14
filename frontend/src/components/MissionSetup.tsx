import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid2";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Popover from "@mui/material/Popover";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import type { SelectChangeEvent } from "@mui/material/Select";

import { EventType, AudienceType } from "../types";
import type { MissionConfig } from "../types";
import { UserRole, AlertThreshold } from "../types";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchTemplates, validateInput } from "../services/api";
import type { ScenarioTemplate, ValidationIssue } from "../services/api";

interface MissionSetupProps {
  initialConfig?: MissionConfig;
  onComplete: (config: MissionConfig) => void;
}

const DEFAULT_CONFIG: MissionConfig = {
  event_name: "",
  event_type: EventType.MUSIC_FESTIVAL,
  event_location: "",
  event_date: "",
  start_time: "",
  end_time: "",
  expected_attendance: 10000,
  audience_type: AudienceType.MIXED,
  additional_notes: "",
  role: UserRole.ORGANIZER,
  alert_threshold: AlertThreshold.STANDARD,
};

function normalizeMissionConfig(initial?: MissionConfig): MissionConfig {
  if (!initial) return DEFAULT_CONFIG;
  if (initial.event_date && initial.start_time && initial.end_time) {
    return { ...DEFAULT_CONFIG, ...initial };
  }
  const dt = (initial.date_time ?? "").trim();
  if (!dt) return { ...DEFAULT_CONFIG, ...initial };
  if (dt.includes("–") || dt.includes(" - ")) {
    const sep = dt.includes("–") ? "–" : " - ";
    const [left, right] = dt.split(sep).map((s) => s.trim());
    const [d, st] = (left ?? "").split(/\s+/);
    const et = (right ?? st ?? "23:59").slice(0, 5);
    return {
      ...DEFAULT_CONFIG,
      ...initial,
      event_date: (d ?? "").slice(0, 10),
      start_time: (st ?? "").slice(0, 5),
      end_time: et.length === 5 ? et : "23:59",
    };
  }
  const iso = dt.replace("T", " ").slice(0, 16);
  const [datePart, timePart] = iso.split(/\s+/);
  return {
    ...DEFAULT_CONFIG,
    ...initial,
    event_date: (datePart ?? "").slice(0, 10),
    start_time: (timePart ?? "").slice(0, 5),
    end_time: (timePart ?? "23:59").slice(0, 5),
  };
}

export default function MissionSetup({
  initialConfig,
  onComplete,
}: MissionSetupProps) {
  const { t } = useLanguage();
  const [config, setConfig] = useState<MissionConfig>(
    () => normalizeMissionConfig(initialConfig),
  );
  const [templates, setTemplates] = useState<ScenarioTemplate[]>([]);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [alertHelpAnchor, setAlertHelpAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    fetchTemplates().then((r) => setTemplates(r.templates)).catch(() => {});
  }, []);

  const handleTextChange =
    (field: keyof MissionConfig) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setConfig((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSelectChange =
    (field: keyof MissionConfig) => (e: SelectChangeEvent) => {
      setConfig((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const composedDateTime = config.event_date && config.start_time && config.end_time
    ? `${config.event_date} ${config.start_time}–${config.end_time}`
    : (config.date_time ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateInput({
      event_name: config.event_name,
      event_location: config.event_location,
      date_time: composedDateTime,
      expected_attendance: config.expected_attendance,
    }).then((r) => {
      setValidationIssues(r.issues);
      if (r.valid) onComplete({ ...config, date_time: composedDateTime });
    }).catch(() => setValidationIssues([]));
  };

  const applyTemplate = () => {
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) return;
    const p = tpl.preset;
    setConfig((prev) => ({
      ...prev,
      event_name: p.event_name,
      event_location: p.event_location,
      expected_attendance: p.expected_attendance,
      additional_notes: p.additional_notes ?? prev.additional_notes,
      event_type: (tpl.event_type as EventType) || prev.event_type,
    }));
    setValidationIssues([]);
  };



  const isValid =
    config.event_name.trim().length > 0 &&
    config.event_location.trim().length > 0 &&
    config.event_date.length > 0 &&
    config.start_time.length > 0 &&
    config.end_time.length > 0 &&
    config.expected_attendance > 0;

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ maxWidth: 820, mx: "auto", py: 2 }}
    >
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        {t.mission.title}
      </Typography>

      {/* -- シナリオテンプレート・サンプル --------------------------------- */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" color="primary" gutterBottom>
            {t.mission.templates}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>{t.mission.templateLabel}</InputLabel>
              <Select
                value={selectedTemplateId}
                label={t.mission.templateLabel}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                <MenuItem value="">{t.mission.noTemplateOption}</MenuItem>
                {templates.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PlaylistPlayIcon />}
              onClick={applyTemplate}
              disabled={!selectedTemplateId}
            >
              {t.mission.applyTemplate}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* -- Basic Info --------------------------------------------------- */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" color="primary" gutterBottom>
            {t.mission.basicInfo}
          </Typography>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label={t.mission.eventName}
                fullWidth
                required
                value={config.event_name}
                onChange={handleTextChange("event_name")}
                placeholder={t.mission.eventNamePlaceholder}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label={t.mission.eventLocation}
                fullWidth
                required
                value={config.event_location}
                onChange={handleTextChange("event_location")}
                placeholder={t.mission.eventLocationPlaceholder}
                helperText={
                  config.event_location.trim().length === 0
                    ? (t.mission.eventLocation + " *")
                    : undefined
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{t.mission.eventType}</InputLabel>
                <Select
                  value={config.event_type}
                  label={t.mission.eventType}
                  onChange={handleSelectChange("event_type")}
                >
                  {Object.values(EventType).map((val) => (
                    <MenuItem key={val} value={val}>
                      {t.eventTypes[val] ?? val}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t.mission.eventDateLabel}
                type="date"
                fullWidth
                required
                value={config.event_date}
                onChange={handleTextChange("event_date")}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: "2099-12-31" } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label={t.mission.startTimeLabel}
                type="time"
                fullWidth
                required
                value={config.start_time}
                onChange={handleTextChange("start_time")}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 300 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label={t.mission.endTimeLabel}
                type="time"
                fullWidth
                required
                value={config.end_time}
                onChange={handleTextChange("end_time")}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 300 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t.mission.expectedAttendance}
                type="number"
                fullWidth
                required
                value={config.expected_attendance}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    expected_attendance: Math.max(
                      1,
                      parseInt(e.target.value, 10) || 0,
                    ),
                  }))
                }
                slotProps={{ htmlInput: { min: 1, max: 10000000 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{t.mission.audienceType}</InputLabel>
                <Select
                  value={config.audience_type}
                  label={t.mission.audienceType}
                  onChange={handleSelectChange("audience_type")}
                >
                  {Object.values(AudienceType).map((val) => (
                    <MenuItem key={val} value={val}>
                      {t.audienceTypes[val] ?? val}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{t.mission.role}</InputLabel>
                <Select
                  value={config.role ?? UserRole.ORGANIZER}
                  label={t.mission.role}
                  onChange={handleSelectChange("role")}
                >
                  <MenuItem value={UserRole.ORGANIZER}>{t.mission.userRoles.organizer}</MenuItem>
                  <MenuItem value={UserRole.SECURITY}>{t.mission.userRoles.security}</MenuItem>
                  <MenuItem value={UserRole.LOCAL_GOV}>{t.mission.userRoles.local_gov}</MenuItem>
                  <MenuItem value={UserRole.VENUE_MANAGER}>{t.mission.userRoles.venue_manager}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
                <FormControl fullWidth sx={{ flex: 1 }}>
                  <InputLabel>{t.mission.alertThreshold}</InputLabel>
                  <Select
                    value={config.alert_threshold ?? AlertThreshold.STANDARD}
                    label={t.mission.alertThreshold}
                    onChange={handleSelectChange("alert_threshold")}
                  >
                    <MenuItem value={AlertThreshold.CONSERVATIVE}>{t.mission.alertOptions.conservative}</MenuItem>
                    <MenuItem value={AlertThreshold.STANDARD}>{t.mission.alertOptions.standard}</MenuItem>
                    <MenuItem value={AlertThreshold.AGGRESSIVE}>{t.mission.alertOptions.aggressive}</MenuItem>
                  </Select>
                </FormControl>
                <IconButton
                  size="small"
                  onClick={(e) => setAlertHelpAnchor(e.currentTarget)}
                  sx={{ mt: 1, p: 0.5, color: "text.secondary" }}
                  aria-label={t.mission.alertThresholdHelpLabel}
                >
                  <Typography component="span" sx={{ fontSize: "0.875rem", fontWeight: 600 }}>?</Typography>
                </IconButton>
              </Box>
              <Popover
                open={Boolean(alertHelpAnchor)}
                anchorEl={alertHelpAnchor}
                onClose={() => setAlertHelpAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                transformOrigin={{ vertical: "top", horizontal: "center" }}
              >
                <Typography sx={{ p: 1.5, maxWidth: 320 }} variant="body2" color="text.secondary">
                  {t.mission.alertThresholdDescription}
                </Typography>
              </Popover>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* -- Additional Notes --------------------------------------------- */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" color="primary" gutterBottom>
            {t.mission.additionalNotes}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={config.additional_notes}
            onChange={handleTextChange("additional_notes")}
            placeholder={t.mission.additionalNotesPlaceholder}
          />
        </CardContent>
      </Card>

      {validationIssues.length > 0 && (
        <Alert severity={validationIssues.some((i) => i.severity === "error") ? "error" : "warning"} sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>入力の確認</Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {validationIssues.map((i, idx) => (
              <li key={idx}>{i.message}</li>
            ))}
          </ul>
        </Alert>
      )}

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={!isValid}
          endIcon={<ArrowForwardIcon />}
        >
          {t.mission.nextButton}
        </Button>
      </Box>
    </Box>
  );
}
