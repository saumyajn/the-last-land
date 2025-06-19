// src/App.js
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import {
  Box,
  Container
} from "@mui/material";

import Header from "./components/Header";
import HomeTabs from "./components/HomeTabs";
import Footer from "./components/Footer";

import StatsPage from "./components/stats/StatsPage";
import FormationPage from "./components/formation/FormationPage";
import ReportPage from "./components/report/ReportPage";
import AnalyticsPage from "./components/analytics/AnalyticsPage";
import AboutPage from "./components/AboutPage";

import { db } from "./utils/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

export default function App() {
  const [groupedData, setGroupedData] = useState({});
  const [groupedCavalry, setGroupedCavalryData] = useState({});
  const [thresholds, setThresholds] = useState([]);

  useEffect(() => {
    const fetchThresholdsAndData = async () => {
      try {
        const thresholdsRef = doc(db, "settings", "thresholds");
        const thresholdsSnap = await getDoc(thresholdsRef);

        if (!thresholdsSnap.exists()) return;

        const tData = thresholdsSnap.data().thresholds || [];
        setThresholds(tData);
        const colorNames = {};
        tData.forEach(th => {
          colorNames[th.color] = th.name;
        });

        const playersCollection = collection(db, "stats");
        const playersSnap = await getDocs(playersCollection);

        const newGroupedData = {};
        const newGroupedCavalryData = {};

        tData.forEach((t) => {
          newGroupedData[t.color] = [{ colorName: t.name, avgDamage: 0 }];
          newGroupedCavalryData[t.color] = [{ colorName: t.name, avgDamage: 0 }];
        });

        playersSnap.forEach((playerDoc) => {
          const playerName = playerDoc.id;
          const playerData = playerDoc.data();

          const archerVal = parseFloat(playerData["Final Archer Damage"]) || 0;
          const archerMatch = tData
            .slice()
            .sort((a, b) => b.limit - a.limit)
            .find((t) => archerVal >= t.limit);

          const archerColor = archerMatch ? archerMatch.color : "default";
          if (!newGroupedData[archerColor]) newGroupedData[archerColor] = [{ colorName: colorNames[archerColor] || archerColor }];
          newGroupedData[archerColor].push({ name: playerName, damage: archerVal });

          const cavalryVal = parseFloat(playerData["Final Cavalry Damage"]) || 0;
          const cavalryMatch = tData
            .slice()
            .sort((a, b) => b.limit - a.limit)
            .find((t) => cavalryVal >= t.limit);
          const cavalryColor = cavalryMatch ? cavalryMatch.color : "default";
          if (!newGroupedCavalryData[cavalryColor]) newGroupedCavalryData[cavalryColor] = [{ colorName: colorNames[cavalryColor] || cavalryColor }];
          newGroupedCavalryData[cavalryColor].push({ name: playerName, damage: cavalryVal });
        });

        for (const color in newGroupedData) {
          const players = newGroupedData[color].filter(p => typeof p === 'object' && 'damage' in p);
          const total = players.reduce((sum, p) => sum + (p.damage || 0), 0);
          const avg = total / players.length;
          newGroupedData[color][0].avgDamage = parseFloat(avg.toFixed(2));
        }

        for (const color in newGroupedCavalryData) {
          const players = newGroupedCavalryData[color].filter(p => typeof p === 'object' && 'damage' in p);
          const total = players.reduce((sum, p) => sum + (p.damage || 0), 0);
          const avg = total / players.length;
          newGroupedCavalryData[color][0].avgDamage = parseFloat(avg.toFixed(2));
        }

        setGroupedData(() => newGroupedData);
        setGroupedCavalryData(() => newGroupedCavalryData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchThresholdsAndData();
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Router>
        <Header />
        <HomeTabs />
        <Container maxWidth="xl" sx={{ flex: 1 }}>
          <Routes>
            <Route path="/stats" element={<StatsPage />} />
            <Route
              path="/formation"
              element={
                <FormationPage
                  groupedData={groupedData}
                  groupedCavalryData={groupedCavalry}
                  thresholds={thresholds}
                />
              }
            />
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
