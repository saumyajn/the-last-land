// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Container from "@mui/material/Container";
import Header from "./components/Header";
import HomeTabs from "./components/HomeTabs";
import AboutPage from "./components/AboutPage";
import StatsPage from "./components/stats/StatsPage";
import FormationPage from "./components/formation/FormationPage";
import ReportPage from "./components/report/ReportPage";
import AnalyticsPage from "./components/analytics/AnalyticsPage";
import Footer from "./components/Footer";
import { Box } from "@mui/material";

export default function App() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
    <Router >
      <Header />
      <HomeTabs />
      <Container maxWidth='xl'sx={{flex:1}} >
        <Routes>

          <Route path="/stats" element={<StatsPage />} />
          <Route path="/formation" element={<FormationPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/about" element={<AboutPage />} />

          <Route path="*" element={<Navigate to="/analytics" replace />} />
        </Routes>
        </Container >
        
    </Router>
    <Footer/>
    </Box>
    
  );
}
