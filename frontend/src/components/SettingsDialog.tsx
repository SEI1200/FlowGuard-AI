// ---------------------------------------------------------------------------
// FlowGuard AI - Settings Dialog
// タイムアウト等の設定と「何に影響するか」の説明
// ---------------------------------------------------------------------------

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import SystemInfoDialog from "./SystemInfoDialog";
import { useLanguage } from "../i18n/LanguageContext";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SIMULATE_TIMEOUT_MS = (() => {
  const env = import.meta.env.VITE_SIMULATE_TIMEOUT_MS;
  if (env !== undefined && env !== "") {
    const n = parseInt(env, 10);
    if (!Number.isNaN(n) && n > 0) return Math.min(n, 600_000);
  }
  return 240_000;
})();

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { t } = useLanguage();
  const [systemInfoOpen, setSystemInfoOpen] = useState(false);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t.settings.title}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            シミュレーションタイムアウト
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            現在: {Math.round(SIMULATE_TIMEOUT_MS / 1000 / 60)} 分（環境変数 VITE_SIMULATE_TIMEOUT_MS で変更可能）
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            リスク分析APIの待ち時間の上限です。Gemini・天候取得・再試行で2〜4分かかることがあるため、短くしすぎるとタイムアウトエラーになりやすくなります。長くすると完了まで待ち続けます。
          </Typography>
        </Box>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            API ベースURL
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {import.meta.env.VITE_API_BASE_URL || t.settings.apiUrlNotSet}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            バックエンドのベースURL。シミュレーション・道路スナップ・PDF出力・テンプレート取得に使用します。
          </Typography>
        </Box>
        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" size="small" onClick={() => setSystemInfoOpen(true)}>
            アーキテクチャ・費用・運用設計
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t.assist.close}</Button>
      </DialogActions>
      <SystemInfoDialog open={systemInfoOpen} onClose={() => setSystemInfoOpen(false)} />
    </Dialog>
  );
}
