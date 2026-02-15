// ---------------------------------------------------------------------------
// FlowGuard AI - AI Assist floating widget (LINE風チャットUI)
// 画面端に小さく表示、ドラッグで移動可能。クリックでパネルを開き、メッセージ形式でやり取り。
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import CloseIcon from "@mui/icons-material/Close";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SendIcon from "@mui/icons-material/Send";
import { useLanguage } from "../i18n/LanguageContext";
import { askAssist, type AssistContext } from "../services/api";

const FAB_SIZE = 48;
const PANEL_WIDTH = 340;
const PANEL_HEIGHT = 440;
const MIN_PANEL_WIDTH = 280;
const MIN_PANEL_HEIGHT = 320;
const MAX_PANEL_WIDTH = 560;
const MAX_PANEL_HEIGHT = 680;
const DRAG_THRESHOLD = 6;

type MessageRole = "assistant" | "user";

interface ChatMessage {
  role: MessageRole;
  text: string;
}

export interface AssistFabProps {
  /** Optional app state for context-aware next-action suggestions */
  assistContext?: AssistContext | null;
}

export default function AssistFab({ assistContext }: AssistFabProps = {}) {
  const { t } = useLanguage();
  const [fabX, setFabX] = useState(() => typeof window !== "undefined" ? window.innerWidth - FAB_SIZE - 16 : 300);
  const [fabY, setFabY] = useState(() => typeof window !== "undefined" ? window.innerHeight - FAB_SIZE - 80 : 300);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelX, setPanelX] = useState(() => typeof window !== "undefined" ? (window.innerWidth - PANEL_WIDTH) / 2 : 200);
  const [panelY, setPanelY] = useState(() => typeof window !== "undefined" ? Math.max(60, (window.innerHeight - PANEL_HEIGHT) / 2) : 80);
  const [panelWidth, setPanelWidth] = useState(PANEL_WIDTH);
  const [panelHeight, setPanelHeight] = useState(PANEL_HEIGHT);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fabDragRef = useRef({ active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0, panelWasOpen: false });
  const panelDragRef = useRef({ active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 });
  const resizeRef = useRef({ active: false, startX: 0, startY: 0, startW: 0, startH: 0 });
  const fabClickRef = useRef({ downX: 0, downY: 0 });

  // パネルを開いたときに挨拶がなければ1件追加
  useEffect(() => {
    if (panelOpen && messages.length === 0) {
      setMessages([{ role: "assistant", text: t.assist.greeting }]);
    }
  }, [panelOpen, messages.length, t.assist.greeting]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (messages.length) scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const handleFabMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    fabDragRef.current = { active: true, startX: e.clientX, startY: e.clientY, startLeft: fabX, startTop: fabY, panelWasOpen: panelOpen };
    fabClickRef.current = { downX: e.clientX, downY: e.clientY };
  }, [fabX, fabY, panelOpen]);

  const handlePanelMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, input, textarea, [role='button']")) return;
    e.preventDefault();
    panelDragRef.current = { active: true, startX: e.clientX, startY: e.clientY, startLeft: panelX, startTop: panelY };
  }, [panelX, panelY]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (fabDragRef.current.active) {
      const dx = e.clientX - fabDragRef.current.startX;
      const dy = e.clientY - fabDragRef.current.startY;
      setFabX(Math.max(0, Math.min(window.innerWidth - FAB_SIZE, fabDragRef.current.startLeft + dx)));
      setFabY(Math.max(0, Math.min(window.innerHeight - FAB_SIZE, fabDragRef.current.startTop + dy)));
    }
    if (panelDragRef.current.active) {
      const r = panelDragRef.current;
      const dx = e.clientX - r.startX;
      const dy = e.clientY - r.startY;
      const w = panelWidth;
      const h = panelHeight;
      setPanelX(Math.max(0, Math.min(window.innerWidth - w, r.startLeft + dx)));
      setPanelY(Math.max(0, Math.min(window.innerHeight - h, r.startTop + dy)));
    }
    if (resizeRef.current.active) {
      const r = resizeRef.current;
      const dw = e.clientX - r.startX;
      const dh = e.clientY - r.startY;
      setPanelWidth(Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, r.startW + dw)));
      setPanelHeight(Math.max(MIN_PANEL_HEIGHT, Math.min(MAX_PANEL_HEIGHT, r.startH + dh)));
    }
  }, [panelWidth, panelHeight]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (fabDragRef.current.active) {
      const moved = Math.hypot(
        e.clientX - fabClickRef.current.downX,
        e.clientY - fabClickRef.current.downY,
      );
      if (moved < DRAG_THRESHOLD) {
        const wasOpen = fabDragRef.current.panelWasOpen;
        setPanelOpen(!wasOpen);
      }
      fabDragRef.current.active = false;
    }
    if (panelDragRef.current.active) panelDragRef.current.active = false;
    if (resizeRef.current.active) resizeRef.current.active = false;
  }, []);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { active: true, startX: e.clientX, startY: e.clientY, startW: panelWidth, startH: panelHeight };
  }, [panelWidth, panelHeight]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || loading) return;
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);
    try {
      const answer = await askAssist(text, assistContext);
      setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : t.assist.error;
      setMessages((prev) => [...prev, { role: "assistant", text: `⚠️ ${errMsg}` }]);
    } finally {
      setLoading(false);
    }
  }, [inputValue, loading, assistContext, t.assist.error]);

  return (
    <>
      {/* フロートボタン（ドラッグで移動） */}
      <Paper
        elevation={4}
        sx={{
          position: "fixed",
          left: fabX,
          top: fabY,
          width: FAB_SIZE,
          height: FAB_SIZE,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "grab",
          zIndex: 1300,
          bgcolor: "primary.main",
          color: "primary.contrastText",
          "&:active": { cursor: "grabbing" },
        }}
        onMouseDown={handleFabMouseDown}
        role="button"
        aria-label={t.assist.title}
      >
        <SmartToyIcon sx={{ fontSize: 28 }} />
      </Paper>

      {/* パネル（LINE風チャット） */}
      {panelOpen && (
        <Paper
          elevation={8}
          sx={{
            position: "fixed",
            left: panelX,
            top: panelY,
            width: panelWidth,
            height: panelHeight,
            borderRadius: 2,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 1301,
          }}
        >
          {/* ヘッダー */}
          <Box
            onMouseDown={handlePanelMouseDown}
            sx={{
              px: 1.5,
              py: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid",
              borderColor: "divider",
              cursor: "grab",
              bgcolor: "primary.main",
              color: "primary.contrastText",
              "&:active": { cursor: "grabbing" },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SmartToyIcon sx={{ fontSize: 22 }} />
              <Typography variant="subtitle2" fontWeight={600}>
                {t.assist.title}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setPanelOpen(false)} aria-label={t.assist.close} sx={{ color: "inherit" }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* メッセージ一覧（LINE風バブル） */}
          <Box
            sx={{
              flex: 1,
              overflow: "auto",
              p: 1.5,
              bgcolor: "#E5DDD5",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
            }}
          >
            {messages.map((msg, i) => (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                {msg.role === "assistant" && (
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      bgcolor: "grey.300",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      mr: 0.75,
                      mt: 0.5,
                    }}
                  >
                    <SmartToyIcon sx={{ fontSize: 16, color: "grey.600" }} />
                  </Box>
                )}
                <Paper
                  elevation={0}
                  sx={{
                    maxWidth: "80%",
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    borderTopLeftRadius: msg.role === "assistant" ? 4 : 12,
                    borderTopRightRadius: msg.role === "user" ? 4 : 12,
                    bgcolor: msg.role === "user" ? "#DCF8C6" : "#FFFFFF",
                    boxShadow: "0 1px 1px rgba(0,0,0,0.08)",
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {msg.role === "assistant" ? msg.text.replace(/\*\*/g, "") : msg.text}
                  </Typography>
                </Paper>
              </Box>
            ))}
            {loading && (
              <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                <Box sx={{ mr: 0.75, mt: 0.5, width: 28, flexShrink: 0 }} />
                <Paper
                  elevation={0}
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    borderTopLeftRadius: 4,
                    bgcolor: "#FFFFFF",
                    boxShadow: "0 1px 1px rgba(0,0,0,0.08)",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {t.assist.loading}
                  </Typography>
                </Paper>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* 入力エリア（LINE風） */}
          <Box
            sx={{
              p: 1,
              borderTop: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              display: "flex",
              alignItems: "flex-end",
              gap: 0.5,
            }}
          >
            <TextField
              size="small"
              fullWidth
              placeholder={t.assist.placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              multiline
              maxRows={3}
              disabled={loading}
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 4,
                  bgcolor: "grey.100",
                },
              }}
            />
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={loading || !inputValue.trim()}
              sx={{ flexShrink: 0, bgcolor: "primary.main", color: "primary.contrastText", "&:hover": { bgcolor: "primary.dark" }, "&.Mui-disabled": { bgcolor: "grey.300", color: "grey.500" } }}
              aria-label={t.assist.send}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* リサイズハンドル（右下） */}
          <Box
            onMouseDown={handleResizeMouseDown}
            sx={{
              position: "absolute",
              right: 0,
              bottom: 0,
              width: 20,
              height: 20,
              cursor: "nwse-resize",
              "&::after": {
                content: '""',
                position: "absolute",
                right: 4,
                bottom: 4,
                width: 8,
                height: 8,
                borderRight: "2px solid",
                borderBottom: "2px solid",
                borderColor: "action.disabled",
              },
            }}
            aria-label="Resize panel"
          />
        </Paper>
      )}
    </>
  );
}
