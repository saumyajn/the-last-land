// src/App.js
import React, { useState, useEffect } from "react";
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

import { db } from "./utils/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged, getRedirectResult } from "firebase/auth";

export default function App() {
  const [groupedData, setGroupedData] = useState({});
  const [groupedCavalry, setGroupedCavalryData] = useState({});
  const [groupedAverageData, setGroupedAverageData] = useState({});
  const [thresholds, setThresholds] = useState([]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (process.env.NODE_ENV === 'development') {
        console.log("Auth state:", firebaseUser);
      }
      getRedirectResult(auth)
        .then((result) => {
          if (result?.user) {
            console.log("✅ Logged in via redirect:", result.user);
          } else {
            console.log("ℹ️ No user from redirect.");
          }
        })
        .catch((error) => {
          console.error("❌ Redirect login failed:", error.message, error);
        });
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchThresholdsAndData = async () => {
      try {
        const thresholdsRef = doc(db, "settings", "thresholds");
        const thresholdsSnap = await getDoc(thresholdsRef);
        if (!thresholdsSnap.exists()) return;

        const tData = thresholdsSnap.data().thresholds || [];
        setThresholds(tData);
        const colorNames = {};
        tData.forEach(th => colorNames[th.color] = th.name);

        const playersSnap = await getDocs(collection(db, "stats"));

        const newGroupedData = {};
        const newGroupedCavalryData = {};
        const newGroupedAverageData = {};

        tData.forEach(t => {
          newGroupedData[t.color] = [{ colorName: t.name, avgDamage: 0 }];
          newGroupedCavalryData[t.color] = [{ colorName: t.name, avgDamage: 0 }];
          newGroupedAverageData[t.color] = [{ colorName: t.name, avgDamage: 0 }];
        });

        playersSnap.forEach(playerDoc => {
          const playerName = playerDoc.id;
          const data = playerDoc.data();
          const archerVal = parseFloat(data["Final Archer Damage"]) || 0;
          const cavalryVal = parseFloat(data["Final Cavalry Damage"]) || 0;

          // Archer grouping
          const archerMatch = tData.slice().sort((a, b) => b.limit - a.limit).find(t => archerVal >= t.limit);
          const archerColor = archerMatch ? archerMatch.color : "default";
          if (!newGroupedData[archerColor]) newGroupedData[archerColor] = [{ colorName: colorNames[archerColor] || archerColor }];
          newGroupedData[archerColor].push({ name: playerName, damage: archerVal });

          // Cavalry grouping
          const cavalryMatch = tData.slice().sort((a, b) => b.limit - a.limit).find(t => cavalryVal >= t.limit);
          const cavalryColor = cavalryMatch.color || "default";
          if (!newGroupedCavalryData[cavalryColor]) newGroupedCavalryData[cavalryColor] = [{ colorName: colorNames[cavalryColor] || cavalryColor }];
          newGroupedCavalryData[cavalryColor].push({ name: playerName, damage: cavalryVal });

          // Average grouping
          const avgVal = (archerVal + cavalryVal) / 2;
          const avgMatch = tData.slice().sort((a, b) => b.limit - a.limit).find(t => avgVal >= t.limit);
          const avgColor = avgMatch.color || "default";
          if (!newGroupedAverageData[avgColor]) newGroupedAverageData[avgColor] = [{ colorName: colorNames[avgColor] || avgColor }];
          newGroupedAverageData[avgColor].push({ name: playerName, damage: avgVal });
        });

        const computeAverages = (group) => {
          for (const color in group) {
            const players = group[color].filter(p => typeof p === "object" && "damage" in p);
            const total = players.reduce((sum, p) => sum + (p.damage || 0), 0);
            const avg = total / players.length;
            group[color][0].avgDamage = parseFloat(avg.toFixed(2));
          }
        };

        computeAverages(newGroupedData);
        computeAverages(newGroupedCavalryData);
        computeAverages(newGroupedAverageData);

        setGroupedData(() => newGroupedData);
        setGroupedCavalryData(() => newGroupedCavalryData);
        setGroupedAverageData(() => newGroupedAverageData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchThresholdsAndData();
  }, []);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
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
                  groupedAverageData={groupedAverageData}
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
