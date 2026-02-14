// ---------------------------------------------------------------------------
// FlowGuard AI - 現場確認メモテンプレ
// 入口/導線/段差/視界/待機列/救護/誘導員配置 等のチェック項目とメモ。ToDo と関連付け可能。
// ---------------------------------------------------------------------------

import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { useEffect, useState } from "react";
import type { SelectChangeEvent } from "@mui/material/Select";

import type { MitigationTask } from "../types";
import type { SiteCheckItem } from "../types/siteCheck";
import { getDefaultSiteCheckItems } from "../types/siteCheck";
import { useLanguage } from "../i18n/LanguageContext";

interface SiteCheckMemoProps {
  items: SiteCheckItem[];
  onChange: (items: SiteCheckItem[]) => void;
  tasks: MitigationTask[];
  defaultExpanded?: boolean;
}

export default function SiteCheckMemo({
  items,
  onChange,
  tasks,
  defaultExpanded = false,
}: SiteCheckMemoProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(defaultExpanded);

  useEffect(() => {
    if (items.length === 0) {
      onChange(getDefaultSiteCheckItems());
    }
  }, []);

  const list = items.length > 0 ? items : getDefaultSiteCheckItems();

  const updateItem = (id: string, patch: Partial<SiteCheckItem>) => {
    onChange(
      list.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  };

  return (
    <Box sx={{ borderTop: "1px solid", borderColor: "divider", mt: 1 }}>
      <Button
        fullWidth
        onClick={() => setOpen((o) => !o)}
        endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{ justifyContent: "space-between", py: 1 }}
      >
        {t.siteCheck.title}
      </Button>
      <Collapse in={open}>
        <Box sx={{ px: 2, pb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            {t.siteCheck.description}
          </Typography>
          {(items.length > 0 ? items : list).map((it) => (
            <Box key={it.id} sx={{ mb: 1.5 }}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                {it.label}
                {it.category && (
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                    （{it.category}）
                  </Typography>
                )}
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder={t.siteCheck.memoPlaceholder}
                value={it.memo ?? ""}
                onChange={(e) => updateItem(it.id, { memo: e.target.value })}
                multiline
                maxRows={2}
                sx={{ mb: 0.5 }}
              />
              <FormControl size="small" fullWidth sx={{ minWidth: 120 }}>
                <InputLabel>{t.siteCheck.linkToDo}</InputLabel>
                <Select
                  value={it.linkedTaskId ?? ""}
                  label={t.siteCheck.linkToDo}
                  onChange={(e: SelectChangeEvent) =>
                    updateItem(it.id, { linkedTaskId: e.target.value || undefined })
                  }
                >
                  <MenuItem value="">なし</MenuItem>
                  {tasks.slice(0, 20).map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {(t.action ?? "").slice(0, 40)}
                      {(t.action?.length ?? 0) > 40 ? "…" : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}
