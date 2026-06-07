import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1d4ed8",
      dark: "#1e3a8a",
      light: "#dbeafe",
    },
    secondary: {
      main: "#0f766e",
      dark: "#115e59",
      light: "#ccfbf1",
    },
    success: {
      main: "#059669",
    },
    error: {
      main: "#dc2626",
    },
    background: {
      default: "#f3f6fb",
      paper: "#ffffff",
    },
    text: {
      primary: "#111827",
      secondary: "#64748b",
    },
    divider: "rgba(15, 23, 42, 0.1)",
  },
  typography: {
    fontFamily: [
      "Inter",
      "ui-sans-serif",
      "system-ui",
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "sans-serif",
    ].join(","),
    h4: {
      fontWeight: 800,
      letterSpacing: 0,
    },
    h5: {
      fontWeight: 800,
      letterSpacing: 0,
    },
    h6: {
      fontWeight: 750,
      letterSpacing: 0,
    },
    button: {
      fontWeight: 750,
      textTransform: "none",
      letterSpacing: 0,
    },
    body2: {
      lineHeight: 1.55,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            "linear-gradient(180deg, #f8fbff 0%, #eef4fb 42%, #f3f6fb 100%)",
        },
        "*:focus-visible": {
          outline: "3px solid rgba(37, 99, 235, 0.35)",
          outlineOffset: 2,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          borderColor: "rgba(15, 23, 42, 0.08)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 40,
          borderRadius: 8,
          boxShadow: "none",
        },
        contained: {
          boxShadow: "0 10px 18px rgba(29, 78, 216, 0.16)",
          "&:hover": {
            boxShadow: "0 14px 26px rgba(29, 78, 216, 0.2)",
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 40,
          minHeight: 40,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: "#ffffff",
        },
        input: {
          minHeight: 24,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          color: "#334155",
          fontWeight: 800,
          backgroundColor: "#f8fafc",
          borderBottomColor: "rgba(15, 23, 42, 0.12)",
        },
        body: {
          borderBottomColor: "rgba(15, 23, 42, 0.08)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 700,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
        },
      },
    },
  },
});
