// ---------------------------------------------------------------------------
// FlowGuard AI - What-if 比較シミュレーション
// 参加者数・時間帯・天候等を変えた複数ケースを比較し、最も効果が大きい案を提案
// ---------------------------------------------------------------------------

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { SelectChangeEvent } from "@mui/material/Select";

import type { MissionConfig, SimulationResponse } from "../types";
import type { WhatIfCase } from "../types/whatIf";
import { getCaseMetrics, getBestCase } from "../types/whatIf";
import { useLanguage } from "../i18n/LanguageContext";

interface WhatIfCompareProps {
  /** 現在表示中の結果（ベースライン） */
  currentResult: SimulationResponse;
  /** 比較用に追加したケース */
  cases: WhatIfCase[];
  /** ケース追加: 設定でシミュレーション実行し、親が cases に追加する */
  onRunAndAddCase: (config: MissionConfig, label: string) => Promise<void>;
  /** このケースを採用（ToDo案を反映した結果として表示） */
  onAdoptCase: (result: SimulationResponse) => void;
  /** ケース追加実行中 */
  loading?: boolean;
  /** 現在の設定（フォーム初期値） */
  currentConfig: MissionConfig | null;
  /** 現在の locale */
  locale: string;
}

export default function WhatIfCompare({
  currentResult,
  cases,
  onRunAndAddCase,
  onAdoptCase,
  loading = false,
  currentConfig,
  locale,
}: WhatIfCompareProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addLabel, setAddLabel] = useState("");
  const [formConfig, setFormConfig] = useState<MissionConfig | null>(currentConfig);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const allCases = [{ id: "current", label: t.whatif.currentCase, result: currentResult }, ...cases];
  // 現在＋追加ケース全体で比較し、現在より改善している追加ケースがあるときだけおすすめする
  const allRowsForBest = [{ result: currentResult }, ...cases.map((c) => ({ result: c.result }))];
  const bestIdx = getBestCase(allRowsForBest);
  const recommendedCase = bestIdx > 0 ? cases[bestIdx - 1] : null;

  const handleOpenAdd = () => {
    setFormConfig(currentConfig);
    setAddLabel(t.whatif.caseLabel(cases.length));
    setSubmitError(null);
    setDialogOpen(true);
  };

  const handleAddCase = async () => {
    if (!formConfig || !addLabel.trim()) return;
    setSubmitError(null);
    try {
      await onRunAndAddCase(formConfig, addLabel.trim());
      setDialogOpen(false);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t.error.runFailed);
    }
  };

  const handleConfigChange = (field: keyof MissionConfig, value: string | number) => {
    setFormConfig((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  return (
    <Box sx={{ borderTop: "1px solid", borderColor: "divider", mt: 1 }}>
      <Button
        fullWidth
        onClick={() => setOpen((o) => !o)}
        endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{ justifyContent: "space-between", py: 1 }}
      >
        {t.whatif.title}
      </Button>
      <Collapse in={open}>
        <Box sx={{ px: 2, pb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            {t.whatif.description}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
            disabled={loading || cases.length >= 3}
            sx={{ mb: 1.5 }}
          >
            {t.whatif.addCase}
          </Button>
          {loading && <LinearProgress sx={{ mb: 1 }} />}

          <Table size="small" sx={{ "& td, & th": { py: 0.75, fontSize: "0.8125rem" } }}>
            <TableHead>
              <TableRow>
                <TableCell>{t.whatif.tableCase}</TableCell>
                <TableCell align="right">{t.whatif.tableScore}</TableCell>
                <TableCell align="right">{t.whatif.tableDanger}</TableCell>
                <TableCell>{t.whatif.tablePeak}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allCases.map((row, idx) => {
                const metrics = getCaseMetrics(row.result);
                const isCase = "config" in row;
                const isRecommended = isCase && recommendedCase && (row as WhatIfCase).id === recommendedCase.id;
                return (
                  <TableRow key={(row as WhatIfCase).id ?? "current"}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        {row.label}
                        {isRecommended && (
                          <Chip label={t.whatif.recommended} size="small" color="success" sx={{ height: 20, fontSize: "0.7rem" }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">{metrics.overallScore.toFixed(1)}</TableCell>
                    <TableCell align="right">{metrics.dangerCount}{t.detailExtra.dangerCountUnit}</TableCell>
                    <TableCell sx={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {metrics.peakTimeLabel}
                    </TableCell>
                    <TableCell>
                      {isCase && (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => onAdoptCase((row as WhatIfCase).result)}
                        >
                          {t.whatif.adopt}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {recommendedCase && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              {t.whatif.recommendedHint(recommendedCase.label)}
            </Typography>
          )}
        </Box>
      </Collapse>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t.whatif.dialogTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t.whatif.dialogDescription}
          </Typography>
          <TextField
            fullWidth
            label={t.whatif.caseName}
            value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)}
            sx={{ mb: 2 }}
          />
          {formConfig && (
            <>
              <TextField
                fullWidth
                label={t.whatif.expectedAttendance}
                type="number"
                value={formConfig.expected_attendance}
                onChange={(e) => handleConfigChange("expected_attendance", parseInt(e.target.value, 10) || 0)}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label={t.whatif.startTime}
                type="time"
                value={formConfig.start_time}
                onChange={(e) => handleConfigChange("start_time", e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label={t.whatif.endTime}
                type="time"
                value={formConfig.end_time}
                onChange={(e) => handleConfigChange("end_time", e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>{t.whatif.audienceType}</InputLabel>
                <Select
                  value={formConfig.audience_type}
                  label={t.whatif.audienceType}
                  onChange={(e: SelectChangeEvent) => handleConfigChange("audience_type", e.target.value)}
                >
                  <MenuItem value="youth">若年層</MenuItem>
                  <MenuItem value="family">家族連れ</MenuItem>
                  <MenuItem value="elderly">高齢者多め</MenuItem>
                  <MenuItem value="mixed">混合</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label={t.whatif.additionalNotes}
                multiline
                rows={2}
                value={formConfig.additional_notes ?? ""}
                onChange={(e) => handleConfigChange("additional_notes", e.target.value)}
              />
            </>
          )}
          {submitError && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {submitError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t.whatif.cancel}</Button>
          <Button variant="contained" onClick={handleAddCase} disabled={loading || !formConfig || !addLabel.trim()}>
            {loading ? t.whatif.running : t.whatif.runAndAdd}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
