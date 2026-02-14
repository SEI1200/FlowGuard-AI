// ---------------------------------------------------------------------------
// FlowGuard AI - MapControlsOverlay
//
// 中央マップ上に表示: 地図の表示切替（左上）、交通状況レイヤー凡例（左下・交通ON時）
// ---------------------------------------------------------------------------

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";

import { RiskCategory } from "../types";
import { useLanguage } from "../i18n/LanguageContext";
import type { MapTypeId } from "./RiskLayerControl";

interface MapControlsOverlayProps {
  viewMode?: "2d" | "3d";
  mapTypeId: MapTypeId;
  onMapTypeChange: (v: MapTypeId) => void;
  showTrafficLegend: boolean;
  /** ISO 8601 または "YYYY-MM-DD" 形式。イベント日の曜日表示に使用 */
  eventDateTime?: string;
}

function getWeekdayFromDate(dateTime: string | undefined): string | null {
  if (!dateTime || !dateTime.trim()) return null;
  try {
    const s = dateTime.trim().slice(0, 10);
    const d = new Date(s + "T12:00:00");
    if (Number.isNaN(d.getTime())) return null;
    return String(d.getDay());
  } catch {
    return null;
  }
}

export default function MapControlsOverlay({
  viewMode = "2d",
  mapTypeId,
  onMapTypeChange,
  showTrafficLegend,
  eventDateTime,
}: MapControlsOverlayProps) {
  const { t } = useLanguage();
  const dayIndex = getWeekdayFromDate(eventDateTime);
  const weekdayLabel =
    dayIndex != null && t.weekdays?.[Number(dayIndex)]
      ? t.weekdays[Number(dayIndex)]
      : null;

  const is3D = viewMode === "3d";

  return (
    <>
      {/* 左上: 地図の表示（2Dのみ。3Dはラベルなしのため選択UIなし） */}
      {!is3D && (
        <Paper
          elevation={1}
          sx={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 10,
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          <ToggleButtonGroup
            value={mapTypeId}
            exclusive
            onChange={(_, val) => val != null && onMapTypeChange(val)}
            size="small"
            sx={{ "& .MuiToggleButtonGroup-grouped": { border: 0, px: 1.5 } }}
          >
            <ToggleButton value="roadmap" aria-label={t.layer.mapTypeRoadmap}>
              {t.layer.mapTypeRoadmap}
            </ToggleButton>
            <ToggleButton value="roadmap_no_labels" aria-label={t.layer.mapTypeRoadmapNoLabels}>
              {t.layer.mapTypeRoadmapNoLabels}
            </ToggleButton>
            <ToggleButton value="hybrid" aria-label={t.layer.mapTypeHybrid}>
              {t.layer.mapTypeHybrid}
            </ToggleButton>
            <ToggleButton value="satellite" aria-label={t.layer.mapTypeSatellite}>
              {t.layer.mapTypeSatellite}
            </ToggleButton>
          </ToggleButtonGroup>
        </Paper>
      )}

      {/* 左下: 交通状況レイヤー凡例（交通・物流 ON 時・2Dのみ。3Dでは非表示） */}
      {!is3D && showTrafficLegend && (
        <Paper
          elevation={1}
          sx={{
            position: "absolute",
            bottom: 10,
            left: 10,
            zIndex: 10,
            px: 1.5,
            py: 1,
            borderRadius: 1,
            maxWidth: 280,
          }}
        >
          <Typography variant="caption" fontWeight={600} color="text.primary">
            {t.layer.trafficLegendTitle}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 0.25 }}
          >
            {weekdayLabel
              ? t.layer.trafficLegendWeekday(weekdayLabel)
              : t.layer.trafficLegendWeekday("—")}
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box
                sx={{
                  width: 14,
                  height: 5,
                  borderRadius: 0.5,
                  bgcolor: "#1B5E20",
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {t.layer.trafficSmooth}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box
                sx={{
                  width: 14,
                  height: 5,
                  borderRadius: 0.5,
                  bgcolor: "#F9A825",
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {t.layer.trafficModerate}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box
                sx={{
                  width: 14,
                  height: 5,
                  borderRadius: 0.5,
                  bgcolor: "#C62828",
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {t.layer.trafficCongested}
              </Typography>
            </Stack>
          </Stack>
        </Paper>
      )}
    </>
  );
}
