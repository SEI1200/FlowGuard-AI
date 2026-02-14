// ---------------------------------------------------------------------------
// FlowGuard AI - RiskLayerControl Component
//
// Sidebar panel with toggles for each risk category layer.
// Shows risk counts and overall score summary.
// ---------------------------------------------------------------------------

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";

import { RiskCategory, RISK_CATEGORY_COLORS } from "../types";
import { useLanguage } from "../i18n/LanguageContext";

export type MapTypeId = "roadmap" | "roadmap_no_labels" | "satellite" | "hybrid";

interface RiskLayerControlProps {
  visibleCategories: Set<RiskCategory>;
  onToggleCategory: (category: RiskCategory) => void;
  riskCountByCategory: Record<string, number>;
  overallScore: number;
  /** 対策効果適用後のスコア（ToDoチェック反映）。省略時は overallScore のみ表示 */
  overallScoreAfter?: number;
}

function getScoreColor(score: number): string {
  if (score >= 8) return "#D32F2F";
  if (score >= 6) return "#F57C00";
  if (score >= 4) return "#F9A825";
  return "#2E7D32";
}

export default function RiskLayerControl({
  visibleCategories,
  onToggleCategory,
  riskCountByCategory,
  overallScore,
  overallScoreAfter,
}: RiskLayerControlProps) {
  const { t } = useLanguage();
  const displayScore = overallScoreAfter ?? overallScore;
  const scoreColor = getScoreColor(displayScore);

  const getScoreLabel = (score: number): string => {
    if (score >= 8) return t.layer.critical;
    if (score >= 6) return t.layer.high;
    if (score >= 4) return t.layer.moderate;
    return t.layer.low;
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Overall Score */}
      <Box sx={{ mb: 2.5, textAlign: "center" }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textTransform: "uppercase", letterSpacing: 1 }}
        >
          {t.layer.overallRiskScore}
        </Typography>
        <Box
          sx={{
            mt: 1,
            mx: "auto",
            width: 80,
            height: 80,
            borderRadius: "50%",
            border: `4px solid ${scoreColor}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, color: scoreColor, lineHeight: 1 }}
          >
            {displayScore.toFixed(1)}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: scoreColor, fontWeight: 600, fontSize: "0.65rem" }}
          >
            {t.layer.outOf10}
          </Typography>
        </Box>
        <Chip
          label={getScoreLabel(displayScore)}
          size="small"
          sx={{
            mt: 1,
            bgcolor: scoreColor,
            color: "#FFF",
            fontWeight: 600,
          }}
        />
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Category toggles */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          textTransform: "uppercase",
          letterSpacing: 1,
          display: "block",
          mb: 1,
        }}
      >
        {t.layer.riskLayers}
      </Typography>

      <Stack spacing={0.5}>
        {Object.values(RiskCategory).map((cat) => {
          const color = RISK_CATEGORY_COLORS[cat];
          const label = t.riskCategories[cat] ?? cat;
          const count = riskCountByCategory[cat] ?? 0;
          const visible = visibleCategories.has(cat);

          return (
            <Box
              key={cat}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 1,
                py: 0.5,
                borderRadius: 1,
                bgcolor: visible ? `${color}11` : "transparent",
                transition: "background-color 0.2s",
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={visible}
                    onChange={() => onToggleCategory(cat)}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": { color },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                        { backgroundColor: color },
                    }}
                  />
                }
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        bgcolor: color,
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {label}
                    </Typography>
                  </Stack>
                }
                sx={{ m: 0, flex: 1 }}
              />
              <Chip
                label={count}
                size="small"
                variant="outlined"
                sx={{
                  minWidth: 28,
                  height: 22,
                  fontSize: "0.7rem",
                  borderColor: color,
                  color,
                }}
              />
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
