// src/App.js
import React, { Suspense, lazy, useContext } from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Box, Container, CssBaseline, LinearProgress, Stack, ThemeProvider, Typography } from "@mui/material";

import Header from "./components/Header";
import HomeTabs from "./components/HomeTabs";
import Footer from "./components/Footer";
import { appTheme } from "./utils/theme";
import { AuthContext } from "./utils/authContext";
import { Analytics } from "@vercel/analytics/react";

const routeModules = {
  "/": () => import("./components/AboutPage"),
  "/stats": () => import("./components/stats/StatsPage"),
  "/formation": () => import("./components/formation/FormationPage"),
  "/report": () => import("./components/report/ReportPage"),
  "/analytics": () => import("./components/analytics/AnalyticsPage"),
};

const AboutPage = lazy(routeModules["/"]);
const StatsPage = lazy(routeModules["/stats"]);
const FormationPage = lazy(routeModules["/formation"]);
const ReportPage = lazy(routeModules["/report"]);
const AnalyticsPage = lazy(routeModules["/analytics"]);

const preloadRoute = (route) => {
  routeModules[route]?.();
};

function PageLoading() {
  return (
    <Stack spacing={2} sx={{ py: 6 }}>
      <LinearProgress sx={{ borderRadius: 999 }} />
      <Typography variant="body2" color="text.secondary" align="center">
        Loading workspace...
      </Typography>
    </Stack>
  );
}

export default function App() {
  const { isAdmin, authReady } = useContext(AuthContext);

  const adminPage = (page) => {
    if (!authReady) return <PageLoading />;
    return isAdmin ? page : <Navigate to="/" replace />;
  };

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100dvh", backgroundColor: "background.default" }}>
        <Router>
          <Header />
          <HomeTabs onPrefetchRoute={preloadRoute} />

          <Container
            component="main"
            maxWidth="xl"
            sx={{
              flex: 1,
              pt: { xs: 2, md: 3 },
              pb: { xs: 3, md: 5 },
              px: { xs: 1.25, sm: 2.5, lg: 3 },
            }}
          >
            <Suspense fallback={<PageLoading />}>
              <Routes>
                <Route path="/" element={<AboutPage />} />
                <Route path="/stats" element={adminPage(<StatsPage />)} />
                <Route path="/formation" element={adminPage(<FormationPage />)} />
                <Route path="/report" element={adminPage(<ReportPage />)} />
                <Route path="/analytics" element={adminPage(<AnalyticsPage />)} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Container>
        </Router>
        <Footer />
      </Box>
      <Analytics />
    </ThemeProvider>
  );
}
