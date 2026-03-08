// src/App.js
import React, { useEffect } from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Box, Container } from "@mui/material";

import Header from "./components/Header";
import HomeTabs from "./components/HomeTabs";
import Footer from "./components/Footer";

import StatsPage from "./components/stats/StatsPage";
import FormationPage from "./components/formation/FormationPage";
import ReportPage from "./components/report/ReportPage";
import AnalyticsPage from "./components/analytics/AnalyticsPage";
import AboutPage from "./components/AboutPage";

import { getAuth, onAuthStateChanged, getRedirectResult } from "firebase/auth";

export default function App() {

  // Auth logic stays here at the top level
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (process.env.NODE_ENV === 'development') {
        console.log("Auth state:", firebaseUser);
      }
      getRedirectResult(auth)
        .then((result) => {
          if (result?.user) console.log("✅ Logged in via redirect:", result.user);
        })
        .catch((error) => console.error("❌ Redirect login failed:", error.message));
    });
    return () => unsubscribe();
  }, []);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Router>
        <Header />
        <HomeTabs />
        <Container maxWidth="xl" sx={{ flex: 1 }}>
          <Routes>
            <Route path="/stats" element={<StatsPage />} />
          
            <Route path="/formation" element={<FormationPage />} />
            
            <Route path="/report" element={<ReportPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<Navigate to="/analytics" replace />} />
          </Routes>
        </Container>
      </Router>
      <Footer />
    </Box>
  );
}