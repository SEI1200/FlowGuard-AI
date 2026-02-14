import { createTheme, type Shadows } from "@mui/material/styles";

/** iOS風カラー */
const IOS_BLUE = "#007AFF";
const IOS_BG = "#F2F2F7";
const IOS_GROUPED_BG = "#FFFFFF";
const IOS_SEPARATOR = "rgba(60, 60, 67, 0.12)";
const IOS_LABEL_SECONDARY = "rgba(60, 60, 67, 0.6)";

const theme = createTheme({
  palette: {
    primary: {
      main: IOS_BLUE,
      light: "#5AC8FA",
      dark: "#0051D5",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#5856D6",
      light: "#AF52DE",
      dark: "#3634A3",
    },
    background: {
      default: IOS_BG,
      paper: IOS_GROUPED_BG,
    },
    error: {
      main: "#FF3B30",
    },
    warning: {
      main: "#FF9500",
    },
    success: {
      main: "#34C759",
    },
    text: {
      primary: "rgba(0, 0, 0, 0.85)",
      secondary: IOS_LABEL_SECONDARY,
    },
    divider: IOS_SEPARATOR,
  },
  typography: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Noto Sans JP', 'Helvetica Neue', sans-serif",
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    h5: { fontWeight: 600, letterSpacing: "-0.01em" },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    body1: { fontWeight: 400 },
    body2: { fontWeight: 400 },
    button: { fontWeight: 600, textTransform: "none" as const },
  },
  shape: {
    borderRadius: 14,
  },
  shadows: [
    "none",
    "0 1px 2px rgba(0,0,0,0.04)",
    "0 2px 8px rgba(0,0,0,0.06)",
    "0 4px 12px rgba(0,0,0,0.06)",
    "0 8px 24px rgba(0,0,0,0.08)",
    "0 12px 32px rgba(0,0,0,0.08)",
    "0 16px 40px rgba(0,0,0,0.08)",
    "0 20px 48px rgba(0,0,0,0.08)",
    "0 24px 56px rgba(0,0,0,0.08)",
    "0 28px 64px rgba(0,0,0,0.08)",
    "0 32px 72px rgba(0,0,0,0.08)",
    "0 36px 80px rgba(0,0,0,0.08)",
    "0 40px 88px rgba(0,0,0,0.08)",
    "0 44px 96px rgba(0,0,0,0.08)",
    "0 48px 104px rgba(0,0,0,0.08)",
    "0 52px 112px rgba(0,0,0,0.08)",
    "0 56px 120px rgba(0,0,0,0.08)",
    "0 60px 128px rgba(0,0,0,0.08)",
    "0 64px 136px rgba(0,0,0,0.08)",
    "0 68px 144px rgba(0,0,0,0.08)",
    "0 72px 152px rgba(0,0,0,0.08)",
    "0 76px 160px rgba(0,0,0,0.08)",
    "0 80px 168px rgba(0,0,0,0.08)",
    "0 84px 176px rgba(0,0,0,0.08)",
    "0 88px 184px rgba(0,0,0,0.08)",
  ] as Shadows,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          padding: "10px 22px",
          textTransform: "none",
          boxShadow: "none",
        },
        contained: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
            filter: "brightness(0.96)",
          },
          "&:active": {
            filter: "brightness(0.92)",
          },
        },
        outlined: {
          borderWidth: 1.5,
          "&:hover": {
            borderWidth: 1.5,
            backgroundColor: "rgba(0, 122, 255, 0.06)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundImage: "none",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          border: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 500,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 12,
            backgroundColor: "rgba(118, 118, 128, 0.08)",
            "& fieldset": {
              borderColor: "transparent",
            },
            "&:hover": {
              backgroundColor: "rgba(118, 118, 128, 0.12)",
            },
            "&.Mui-focused": {
              backgroundColor: "rgba(118, 118, 128, 0.12)",
              "& fieldset": {
                borderWidth: 2,
                borderColor: IOS_BLUE,
              },
            },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          "& fieldset": {
            borderColor: "rgba(60, 60, 67, 0.18)",
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: "0 8px",
          "&.Mui-selected": {
            backgroundColor: "rgba(0, 122, 255, 0.1)",
          },
          "&:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.04)",
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: "none",
          "&.Mui-selected": {
            backgroundColor: "rgba(0, 122, 255, 0.12)",
          },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        grouped: {
          "&:not(:first-of-type)": {
            borderLeft: "none",
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          borderRadius: 12,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: "3px 3px 0 0",
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          fontWeight: 500,
        },
      },
    },
  },
});

export default theme;
