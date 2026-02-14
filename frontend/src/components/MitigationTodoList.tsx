// ---------------------------------------------------------------------------
// FlowGuard AI - MitigationTodoList
// 対策を「やることリスト」として表示（担当・期限・必要物品・現場チェック・優先度順）
// ---------------------------------------------------------------------------

import { useMemo, useState, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Checkbox from "@mui/material/Checkbox";
import Collapse from "@mui/material/Collapse";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";

import type { MitigationTask, RiskItem } from "../types";
import { useLanguage } from "../i18n/LanguageContext";

interface MitigationTodoListProps {
  tasks: MitigationTask[];
  risks?: RiskItem[];
  /** 開催日時（ISO）。期限の推奨表示に使用 */
  eventDateTime?: string | null;
  todoChecks?: Record<string, boolean>;
  onToggle?: (taskId: string, checked: boolean) => void;
  /** 担当（参加中は Firestore と同期） */
  todoAssignees?: Record<string, string>;
  onAssigneeChange?: (taskId: string, value: string) => void;
  /** 担当「その他」の自由入力（参加中は Firestore と同期） */
  todoAssigneeOther?: Record<string, string>;
  onAssigneeOtherChange?: (taskId: string, value: string) => void;
  /** 現場確認済（参加中は Firestore と同期） */
  todoOnSiteChecks?: Record<string, boolean>;
  onOnSiteCheck?: (taskId: string, checked: boolean) => void;
  defaultExpanded?: boolean;
  /** このリスクに紐づくToDoを表示（根拠→対策→ToDo 導線） */
  focusedRiskId?: string | null;
  onFocusedRiskConsumed?: () => void;
}

function priorityScore(task: MitigationTask, riskMap: Map<string, RiskItem>): number {
  const risk = task.risk_id ? riskMap.get(task.risk_id) : null;
  const prob = risk?.probability ?? 0.5;
  return (task.impact_score ?? 5) * prob;
}

export default function MitigationTodoList({
  tasks,
  risks = [],
  eventDateTime,
  todoChecks,
  onToggle,
  todoAssignees: todoAssigneesFromProps,
  onAssigneeChange,
  todoAssigneeOther: todoAssigneeOtherFromProps,
  onAssigneeOtherChange,
  todoOnSiteChecks: todoOnSiteChecksFromProps,
  onOnSiteCheck,
  defaultExpanded = true,
  focusedRiskId,
  onFocusedRiskConsumed,
}: MitigationTodoListProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(defaultExpanded);
  const [localChecked, setLocalChecked] = useState<Set<string>>(new Set());
  const [assigneeOverrides, setAssigneeOverrides] = useState<Record<string, string>>({});
  const [assigneeOtherText, setAssigneeOtherText] = useState<Record<string, string>>({});
  const [itemChecks, setItemChecks] = useState<Record<string, Record<number, boolean>>>({});
  const [onSiteChecks, setOnSiteChecks] = useState<Record<string, boolean>>({});
  const firstMatchRef = useRef<HTMLDivElement | null>(null);

  const syncedAssignees = onAssigneeChange && todoAssigneesFromProps ? todoAssigneesFromProps : null;
  const syncedAssigneeOther = onAssigneeOtherChange && todoAssigneeOtherFromProps ? todoAssigneeOtherFromProps : null;
  const syncedOnSiteChecks = onOnSiteCheck && todoOnSiteChecksFromProps ? todoOnSiteChecksFromProps : null;

  useEffect(() => {
    if (!focusedRiskId) return;
    setOpen(true);
    const t = setTimeout(() => {
      firstMatchRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      onFocusedRiskConsumed?.();
    }, 300);
    return () => clearTimeout(t);
  }, [focusedRiskId, onFocusedRiskConsumed]);

  const riskMap = useMemo(() => new Map(risks.map((r) => [r.id, r])), [risks]);
  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => priorityScore(b, riskMap) - priorityScore(a, riskMap)),
    [tasks, riskMap],
  );

  const checked = todoChecks
    ? new Set(Object.keys(todoChecks).filter((id) => todoChecks[id] === true))
    : localChecked;

  const handleToggle = (taskId: string) => {
    const next = !checked.has(taskId);
    if (!todoChecks) {
      setLocalChecked((prev) => {
        const s = new Set(prev);
        if (next) s.add(taskId);
        else s.delete(taskId);
        return s;
      });
    }
    onToggle?.(taskId, next);
  };

  const handleItemCheck = (taskId: string, itemIdx: number) => {
    setItemChecks((prev) => ({
      ...prev,
      [taskId]: { ...(prev[taskId] ?? {}), [itemIdx]: !(prev[taskId]?.[itemIdx] ?? false) },
    }));
  };

  const handleOnSiteCheck = (taskId: string) => {
    if (onOnSiteCheck && syncedOnSiteChecks) {
      onOnSiteCheck(taskId, !(syncedOnSiteChecks[taskId] ?? false));
    } else {
      setOnSiteChecks((prev) => ({ ...prev, [taskId]: !(prev[taskId] ?? false) }));
    }
  };

  const suggestedDue = (() => {
    if (!eventDateTime || typeof eventDateTime !== "string") return null;
    try {
      const d = new Date(eventDateTime);
      if (Number.isNaN(d.getTime())) return null;
      return (daysBefore: number) => {
        try {
          const copy = new Date(d);
          copy.setDate(copy.getDate() - daysBefore);
          const str = copy.toISOString();
          return str ? str.slice(0, 10) : "";
        } catch {
          return "";
        }
      };
    } catch {
      return null;
    }
  })();

  return (
    <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
      <ListItemButton onClick={() => setOpen((o) => !o)} sx={{ py: 1.25, px: 2 }}>
        <ListItemText
          primary={t.todo.listTitle}
          secondary={t.todo.completedPriority(tasks.length, checked.size)}
          primaryTypographyProps={{ fontWeight: 600, fontSize: "0.9375rem" }}
          secondaryTypographyProps={{ variant: "caption", color: "text.secondary" }}
        />
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        {tasks.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
            {t.todo.emptyListHint}
          </Typography>
        ) : (
        <List disablePadding sx={{ pb: 2, px: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
          {sortedTasks.map((task, index) => {
            const assignee =
              (syncedAssignees ? syncedAssignees[task.id] : assigneeOverrides[task.id]) ?? task.who ?? "";
            const isOther = assignee === t.todo.assigneeOther;
            const otherText =
              (syncedAssigneeOther ? syncedAssigneeOther[task.id] : assigneeOtherText[task.id]) ?? "";
            const items = task.required_items ?? [];
            const onSite = syncedOnSiteChecks ? (syncedOnSiteChecks[task.id] ?? false) : (onSiteChecks[task.id] ?? false);
            const isFocused = Boolean(focusedRiskId && task.risk_id === focusedRiskId);
            const isFirstMatch = isFocused && sortedTasks.findIndex((r) => r.risk_id === focusedRiskId) === index;
            return (
              <Paper
                key={task.id}
                ref={isFirstMatch ? firstMatchRef : undefined}
                variant="outlined"
                sx={{
                  overflow: "hidden",
                  borderRadius: 1.5,
                  ...(isFocused ? { borderColor: "primary.main", borderWidth: 2, boxShadow: 1 } : {}),
                }}
              >
                <ListItemButton
                  dense
                  onClick={() => handleToggle(task.id)}
                  sx={{
                    py: 1,
                    px: 1.5,
                    alignItems: "flex-start",
                    ...(isFocused ? { bgcolor: "primary.main", color: "primary.contrastText", "&:hover": { bgcolor: "primary.dark" } } : {}),
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, mt: 0.25 }}>
                    <Checkbox edge="start" checked={checked.has(task.id)} disableRipple size="small" color={isFocused ? "default" : "primary"} />
                  </ListItemIcon>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.4, mb: 1 }}>
                      {task.action || task.who || "—"}
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, mb: items.length > 0 ? 1 : 0 }} onClick={(e) => e.stopPropagation()}>
                      <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>{t.todo.assigneeLabel}</InputLabel>
                        <Select
                          label={t.todo.assigneeLabel}
                          value={assignee || " "}
                          onChange={(e) => {
                            const v = e.target.value === " " ? "" : e.target.value;
                            if (onAssigneeChange) {
                              onAssigneeChange(task.id, v);
                              if (v !== t.todo.assigneeOther) onAssigneeOtherChange?.(task.id, "");
                            } else {
                              setAssigneeOverrides((prev) => ({ ...prev, [task.id]: v }));
                              if (v !== t.todo.assigneeOther) setAssigneeOtherText((prev) => ({ ...prev, [task.id]: "" }));
                            }
                          }}
                        >
                          <MenuItem value=" ">{t.todo.noAssigneeOption}</MenuItem>
                          {t.todo.assigneeOptions.map((o) => (
                            <MenuItem key={o} value={o}>{o}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {isOther && (
                        <TextField
                          size="small"
                          placeholder={t.todo.assigneeOtherPlaceholder}
                          value={otherText}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (onAssigneeOtherChange) onAssigneeOtherChange(task.id, v);
                            else setAssigneeOtherText((prev) => ({ ...prev, [task.id]: v }));
                          }}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ minWidth: 140, flex: 1, maxWidth: 200 }}
                          inputProps={{ "aria-label": t.todo.assigneeOtherPlaceholder }}
                        />
                      )}
                      {task.due_by ? (
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                          期限: {task.due_by}
                        </Typography>
                      ) : suggestedDue ? (
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                          推奨: {suggestedDue(7)}
                        </Typography>
                      ) : null}
                    </Box>
                    {items.length > 0 && (
                      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, mb: 0.75 }} onClick={(e) => e.stopPropagation()}>
                        {items.map((item, idx) => (
                          <Box key={idx} component="label" sx={{ display: "flex", alignItems: "center", gap: 0.5, cursor: "pointer" }}>
                            <Checkbox
                              size="small"
                              checked={itemChecks[task.id]?.[idx] ?? false}
                              onChange={() => handleItemCheck(task.id, idx)}
                            />
                            <Typography variant="caption" color="text.secondary">{item}</Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                    <Box component="label" sx={{ display: "flex", alignItems: "center", gap: 0.5, cursor: "pointer" }} onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        size="small"
                        checked={onSite}
                        onChange={() => handleOnSiteCheck(task.id)}
                      />
                      <Typography variant="caption" color="text.secondary">{t.todo.onSiteChecked}</Typography>
                    </Box>
                  </Box>
                </ListItemButton>
              </Paper>
            );
          })}
        </List>
        )}
      </Collapse>
    </Box>
  );
}
