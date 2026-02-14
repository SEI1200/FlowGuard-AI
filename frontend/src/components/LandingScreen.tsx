// ---------------------------------------------------------------------------
// FlowGuard AI - Landing Screen
// 新規プロジェクト / プロジェクトに参加（デザイン: 2カラム・ティールグラデーション）
// ---------------------------------------------------------------------------

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import InputAdornment from "@mui/material/InputAdornment";
import Alert from "@mui/material/Alert";
import SecurityIcon from "@mui/icons-material/Security";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import LoginIcon from "@mui/icons-material/Login";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import HubIcon from "@mui/icons-material/Hub";
import { useLanguage } from "../i18n/LanguageContext";
import type { Locale } from "../i18n/translations";

const TEAL_500 = "#14b8a6";
const TEAL_600 = "#0d9488";
const TEAL_700 = "#0f766e";
const TEAL_900 = "#134e4a";
const SLATE_900 = "#0f172a";
const SLATE_800 = "#1e293b";

interface LandingScreenProps {
  firebaseReady: boolean;
  onCreateProject: () => Promise<string>;
  onJoinProject: (code: string) => Promise<boolean>;
}

export default function LandingScreen({
  firebaseReady,
  onCreateProject,
  onJoinProject,
}: LandingScreenProps) {
  const { locale, setLocale, t } = useLanguage();
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLocaleChange = (_: React.MouseEvent<HTMLElement>, value: Locale | null) => {
    if (value) setLocale(value);
  };

  const handleCreate = async () => {
    if (!firebaseReady) {
      setError(t.landing.errorFirebase);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onCreateProject();
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.landing.errorCreateFailed);
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase().replace(/\s/g, "").slice(0, 6);
    if (!code) {
      setError(t.landing.errorEnterCode);
      return;
    }
    if (!firebaseReady) {
      setError(t.landing.errorFirebase);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const ok = await onJoinProject(code);
      setLoading(false);
      if (!ok) setError(t.landing.errorCodeNotFound);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.landing.errorJoinFailed);
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        minHeight: "max(884px, 100dvh)",
        display: "flex",
        flexDirection: "row",
        overflow: "hidden",
        fontFamily: "'Inter', 'Noto Sans JP', sans-serif",
      }}
    >
      {/* Left: gradient hero（比率固定 50%） */}
      <Box
        sx={{
          width: "50%",
          flexShrink: 0,
          minWidth: 0,
          height: "100%",
          background: `linear-gradient(135deg, ${SLATE_900} 0%, ${TEAL_900} 100%)`,
          color: "white",
          p: { xs: 3, lg: 4, xl: 6 },
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* network pattern overlay */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            opacity: 0.3,
            backgroundImage: `
              radial-gradient(rgba(20, 184, 166, 0.15) 1.5px, transparent 1.5px),
              radial-gradient(rgba(20, 184, 166, 0.15) 1.5px, transparent 1.5px)
            `,
            backgroundSize: "32px 32px",
            backgroundPosition: "0 0, 16px 16px",
          }}
        />
        {/* logo */}
        <Box
          sx={{
            position: "absolute",
            top: { xs: 24, lg: 32 },
            left: { xs: 24, lg: 48 },
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            zIndex: 10,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "12px",
              bgcolor: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SecurityIcon sx={{ color: TEAL_500, fontSize: 24 }} />
          </Box>
          <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            {t.app.title}
          </Typography>
        </Box>

        <Box sx={{ position: "relative", zIndex: 10, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: "2.25rem", lg: "3rem", xl: "3.75rem" },
              fontWeight: 700,
              lineHeight: 1.2,
              mb: 2,
              letterSpacing: "0.02em",
            }}
          >
            {t.landing.heroHeadline1}
            <br />
            {t.landing.heroHeadline2}
            <br />
            <Box
              component="span"
              sx={{
                background: `linear-gradient(90deg, ${TEAL_500}, #6366f1)`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              {t.app.title}
            </Box>
          </Typography>
          <Typography
            sx={{
              color: "rgba(226,232,240,1)",
              fontSize: { xs: "1rem", lg: "1.25rem" },
              lineHeight: 1.6,
              maxWidth: 480,
              fontWeight: 300,
              mb: 3,
              whiteSpace: "pre-line",
            }}
          >
            {t.landing.heroSubtitle}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, color: "rgba(148,163,184,1)", fontSize: "0.875rem", fontWeight: 500 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ p: 1, bgcolor: "rgba(20,184,166,0.1)", borderRadius: "50%" }}>
                <AnalyticsIcon sx={{ color: TEAL_500, fontSize: 20 }} />
              </Box>
              <Typography component="span" sx={{ color: "rgba(226,232,240,1)" }}>
                {t.landing.feature1}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ p: 1, bgcolor: "rgba(20,184,166,0.1)", borderRadius: "50%" }}>
                <VerifiedUserIcon sx={{ color: TEAL_500, fontSize: 20 }} />
              </Box>
              <Typography component="span" sx={{ color: "rgba(226,232,240,1)" }}>
                {t.landing.feature2}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ p: 1, bgcolor: "rgba(20,184,166,0.1)", borderRadius: "50%" }}>
                <HubIcon sx={{ color: TEAL_500, fontSize: 20 }} />
              </Box>
              <Typography component="span" sx={{ color: "rgba(226,232,240,1)" }}>
                {t.landing.feature3}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Right: form card（比率固定 50%） */}
      <Box
        sx={{
          width: "50%",
          flexShrink: 0,
          minWidth: 0,
          height: "100%",
          bgcolor: "#F2F2F7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 2, lg: 3 },
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* decorative circles */}
        <Box sx={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
          <Box
            component="svg"
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 500,
              height: 500,
              transform: "translate(33%, -33%)",
              opacity: 0.5,
              color: "rgba(226,232,240,0.5)",
            }}
            fill="currentColor"
            viewBox="0 0 100 100"
          >
            <circle cx={50} cy={50} r={50} />
          </Box>
          <Box
            component="svg"
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: 384,
              height: 384,
              transform: "translate(-33%, 33%)",
              opacity: 0.5,
              color: "rgba(226,232,240,0.5)",
            }}
            fill="currentColor"
            viewBox="0 0 100 100"
          >
            <circle cx={50} cy={50} r={50} />
          </Box>
        </Box>

        <Box
          sx={{
            width: "100%",
            maxWidth: 560,
            bgcolor: "white",
            borderRadius: "24px",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)",
            p: { xs: 3, lg: 4 },
            position: "relative",
            zIndex: 10,
            border: "1px solid rgba(226,232,240,0.8)",
            minHeight: 600,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: SLATE_800, letterSpacing: "-0.02em" }}>
                {t.landing.welcomeTitle}
              </Typography>
              <Typography sx={{ color: "#64748b", mt: 1, fontSize: "1rem" }}>
                {t.landing.welcomeSubtitle}
              </Typography>
            </Box>
            <ToggleButtonGroup
              value={locale}
              exclusive
              onChange={handleLocaleChange}
              size="small"
              sx={{
                bgcolor: "#f1f5f9",
                p: 0.5,
                borderRadius: "8px",
                "& .MuiToggleButton-root": {
                  px: 1.5,
                  py: 1,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  border: "none",
                  "&.Mui-selected": {
                    bgcolor: "white",
                    color: SLATE_800,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  },
                },
              }}
            >
              <ToggleButton value="en">EN</ToggleButton>
              <ToggleButton value="ja">JP</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 3 }}>
            <Button
              fullWidth
              onClick={handleCreate}
              disabled={loading}
              sx={{
                bgcolor: TEAL_600,
                color: "white",
                fontWeight: 700,
                py: 2,
                px: 3,
                borderRadius: "16px",
                justifyContent: "space-between",
                boxShadow: "0 10px 15px -3px rgba(13,148,136,0.1)",
                "&:hover": {
                  bgcolor: TEAL_700,
                  boxShadow: "0 4px 12px rgba(20,184,166,0.25)",
                  transform: "translateY(-1px)",
                },
                transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{ p: 1, bgcolor: "rgba(255,255,255,0.2)", borderRadius: "12px" }}>
                  <AddCircleIcon sx={{ color: "white", fontSize: 28 }} />
                </Box>
                <Box sx={{ textAlign: "left" }}>
                  <Typography component="span" sx={{ display: "block", fontSize: "1.125rem" }}>
                    {t.landing.newProject}
                  </Typography>
                  <Typography component="span" sx={{ display: "block", fontSize: "0.75rem", opacity: 0.9, color: "rgba(255,255,255,0.9)" }}>
                    {t.landing.newProjectDescription}
                  </Typography>
                </Box>
              </Box>
              <ArrowForwardIcon sx={{ opacity: 0.6 }} />
            </Button>

            <Box sx={{ display: "flex", alignItems: "center", py: 1 }}>
              <Box sx={{ flex: 1, borderTop: "1px solid", borderColor: "divider" }} />
              <Typography sx={{ px: 2, color: "text.secondary", fontSize: "0.875rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {t.landing.orDivider}
              </Typography>
              <Box sx={{ flex: 1, borderTop: "1px solid", borderColor: "divider" }} />
            </Box>

            <Box>
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: SLATE_800, mb: 1, ml: 0.5 }}>
                {t.landing.codeLabel}
              </Typography>
              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
                <TextField
                  placeholder={t.landing.joinPlaceholder}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 6))}
                  inputProps={{ maxLength: 6 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ pl: 1 }}>
                        <VpnKeyIcon sx={{ color: "text.secondary", fontSize: 24 }} />
                      </InputAdornment>
                    ),
                    sx: {
                      pl: 0,
                      py: 1.5,
                      borderRadius: "12px",
                      bgcolor: "#f8fafc",
                      fontFamily: "monospace",
                      fontSize: "1.125rem",
                      letterSpacing: "0.2em",
                      "&.Mui-focused": { bgcolor: "white", boxShadow: `0 0 0 4px rgba(20,184,166,0.1)`, borderColor: TEAL_500 },
                    },
                  }}
                  sx={{ flex: 1, "& .MuiOutlinedInput-root": { "& fieldset": { borderRadius: "12px" } } }}
                />
                <Button
                  variant="outlined"
                  onClick={handleJoin}
                  disabled={loading}
                  startIcon={<LoginIcon />}
                  sx={{
                    borderColor: "#e2e8f0",
                    color: SLATE_800,
                    fontWeight: 700,
                    py: 1.5,
                    px: 3,
                    borderRadius: "12px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    whiteSpace: "nowrap",
                    "&:hover": {
                      borderColor: TEAL_500,
                      color: TEAL_600,
                      boxShadow: "0 4px 6px rgba(0,0,0,0.07)",
                    },
                  }}
                >
                  {t.landing.joinButton}
                </Button>
              </Box>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 1, ml: 0.5 }}>
                {t.landing.codeHint}
              </Typography>
            </Box>
          </Box>

          {!firebaseReady && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {t.landing.firebaseHint}
            </Alert>
          )}

          <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid", borderColor: "rgba(241,245,249,1)" }}>
            <Box sx={{ display: "flex", alignItems: "center", fontSize: "0.75rem", color: "#64748b" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: "#10b981",
                    boxShadow: "0 0 8px rgba(16,185,129,0.4)",
                    animation: "pulse 2s ease-in-out infinite",
                    "@keyframes pulse": { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.6 } },
                  }}
                />
                <Typography component="span">{t.landing.systemStatus}</Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
