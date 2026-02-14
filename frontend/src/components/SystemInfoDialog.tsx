// ---------------------------------------------------------------------------
// FlowGuard AI - System Info Dialog
// アーキテクチャ・費用対効果・運用設計の整理表示
// ---------------------------------------------------------------------------

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";

interface SystemInfoDialogProps {
  open: boolean;
  onClose: () => void;
}

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

export default function SystemInfoDialog({ open, onClose }: SystemInfoDialogProps) {
  const { t } = useLanguage();
  const [tab, setTab] = useState(0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t.systemInfo.title}</DialogTitle>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
        <Tab label={t.systemInfo.tabArchitecture} />
        <Tab label={t.systemInfo.tabCostEffect} />
        <Tab label={t.systemInfo.tabOperations} />
      </Tabs>
      <DialogContent>
        <TabPanel value={tab} index={0}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            使用サービス・データフロー
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            フロント: React + Vite、Google Maps JavaScript API（2D）、Cesium + Google Photorealistic 3D Tiles（3D）。バックエンド: FastAPI、Vertex AI（Gemini）によるリスク推論、天候API、OSMベースの道路スナップ。
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            推論ポイント
          </Typography>
          <Typography variant="body2" color="text.secondary">
            イベント設定・ポリゴン → /api/simulate → 天候取得 → Gemini リスク分析 → 要因分解・ボトルネック・対策タスクの付与 → クライアント表示。PDFは /api/report/pdf で生成。
          </Typography>
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            推論回数・キャッシュ・スケール方針
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            1シナリオあたり1回のGemini呼び出し。現状キャッシュは未実装。スケール: バックエンドを水平に増やし、Geminiのレート制限内で並列実行可能。
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            推定コストの目安
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vertex AI（Gemini）の従量課金に依存。1シミュレーションあたりのトークン数に応じて変動。天候API・地図APIも利用量に応じた課金。
          </Typography>
        </TabPanel>
        <TabPanel value={tab} index={2}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            当日運用フロー
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            事前に本ツールでリスク分析・対策ToDo・PDFレポートを出力。当日は「1枚サマリー」「運用手順書」を参照し、巡回ルート・増員トリガー・アナウンス文に従って運用。
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            緊急時手順・責任分界点
          </Typography>
          <Typography variant="body2" color="text.secondary">
            緊急時は主催者・警備・自治体の責任分界に従い、事前に共有した連絡フローと救護オペ手順を実施。本システムはあくまで事前計画用であり、当日の指揮は現場責任者に一任。
          </Typography>
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t.assist.close}</Button>
      </DialogActions>
    </Dialog>
  );
}
