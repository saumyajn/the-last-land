import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import SecurityIcon from "@mui/icons-material/Security";
import BarChartIcon from "@mui/icons-material/BarChart";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";

const workflows = [
  {
    icon: <QueryStatsIcon />,
    title: "Stat Extraction",
    detail: "Gemini parses player stat screenshots into structured Firestore records.",
  },
  {
    icon: <AssessmentIcon />,
    title: "Report Matching",
    detail: "Gemini extracts troop rows and keeps report data editable before saving.",
  },
  {
    icon: <BarChartIcon />,
    title: "Analytics",
    detail: "KPT, damage, charts, and export workflows summarize alliance performance.",
  },
  {
    icon: <SecurityIcon />,
    title: "Protected Data",
    detail: "Admin-only writes, emulator mode, fixtures, and documented contracts protect real users.",
  },
];

const proofItems = [
  "Gemini extraction pipeline",
  "Firebase Auth, Firestore, and local emulators",
  "Regression fixtures around parser and formulas",
  "Read-only charts and spreadsheet export support",
];

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          border: "1px solid rgba(15,23,42,0.08)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1.15fr 0.85fr" },
            gap: { xs: 3, md: 4 },
            alignItems: "center",
          }}
        >
          <Box>
            <Chip
              label="The Last Land Analytics"
              color="primary"
              variant="outlined"
              sx={{ mb: 2, backgroundColor: "primary.light" }}
            />
            <Typography variant="h4" sx={{ maxWidth: 760, mb: 2 }}>
              Production-sensitive analytics for messy game screenshots and real alliance workflows.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 780, lineHeight: 1.75, mb: 3 }}>
              Upload screenshots, extract structured data, compare performance, tune formations, and export reports while keeping real Firebase data protected from local experiments.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Button variant="contained" size="large" onClick={() => navigate("/stats")} startIcon={<PlayArrowIcon />}>
                Start Data Upload
              </Button>
          
            </Stack>
          </Box>

          <Box
            sx={{
              p: 2,
              borderRadius: 3,
              backgroundColor: "#f8fafc",
              border: "1px solid rgba(15,23,42,0.08)",
            }}
          >
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>
              Engineering proof
            </Typography>
            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
              {proofItems.map((item) => (
                <Box
                  key={item}
                  sx={{
                    px: 1.5,
                    py: 1.25,
                    borderRadius: 2,
                    backgroundColor: "#ffffff",
                    border: "1px solid rgba(15,23,42,0.08)",
                    color: "text.primary",
                    fontWeight: 700,
                  }}
                >
                  {item}
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" }, gap: 2 }}>
        {workflows.map((workflow) => (
          <Paper
            key={workflow.title}
            elevation={0}
            sx={{
              p: 2.5,
              border: "1px solid rgba(15,23,42,0.08)",
              borderRadius: 3,
              transition: "border-color 180ms ease, transform 180ms ease",
              "&:hover": {
                borderColor: "rgba(29,78,216,0.28)",
                transform: "translateY(-2px)",
              },
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                color: "primary.dark",
                backgroundColor: "primary.light",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 2,
              }}
            >
              {workflow.icon}
            </Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {workflow.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {workflow.detail}
            </Typography>
          </Paper>
        ))}
      </Box>
    </Box>
  );
}
