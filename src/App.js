import './App.css'
import React, { useState, useEffect } from "react";
import { Box, Container, Tabs, Tab, Typography } from "@mui/material";
import StatsPage from './components/StatsPage';
import FormationPage from "./components/FormationPage";
import ReportPage from "./components/ReportPage";

import { db } from "./utils/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

export default function App() {
  const [activeTab, setActiveTab] = useState(1);
  const [groupedData, setGroupedData] = useState({});
  const [groupedCavalry, setGroupedCavalryData] = useState({});
  const [thresholds, setThresholds] = useState([]);


  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  useEffect(() => {
    const fetchThresholdsAndData = async () => {
      try {
        const thresholdsRef = doc(db, "settings", "thresholds");
        const thresholdsSnap = await getDoc(thresholdsRef);

        if (!thresholdsSnap.exists()) return;

        const tData = thresholdsSnap.data().thresholds || [];
        setThresholds(tData);

        const playersCollection = collection(db, "stats");
        const playersSnap = await getDocs(playersCollection);

        const newGroupedData = {};
        const newGroupedCavalryData = {};

        playersSnap.forEach((playerDoc) => {
          const playerName = playerDoc.id;
          const playerData = playerDoc.data();

          // Archer grouping
          const archerVal = parseFloat(playerData["Final Archer Damage"]);
          const archerMatch = tData
            .slice()
            .sort((a, b) => b.limit - a.limit)
            .find((t) => archerVal >= t.limit);
          const archerColor = archerMatch ? archerMatch.color : "default";
          if (!newGroupedData[archerColor]) newGroupedData[archerColor] = [];
          newGroupedData[archerColor].push({ name: playerName });

          // Cavalry grouping
          const cavalryVal = parseFloat(playerData["Final Cavalry Damage"]);
          const cavalryMatch = tData
            .slice()
            .sort((a, b) => b.limit - a.limit)
            .find((t) => cavalryVal >= t.limit);
          const cavalryColor = cavalryMatch ? cavalryMatch.color : "default";
          if (!newGroupedCavalryData[cavalryColor]) newGroupedCavalryData[cavalryColor] = [];
          newGroupedCavalryData[cavalryColor].push({ name: playerName });
        });

        setGroupedData(() => newGroupedData);
        setGroupedCavalryData(() => newGroupedCavalryData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchThresholdsAndData();
  }, []);

  return (
    <Container maxWidth="xl">
      <Box sx={{ borderBottom: 1, borderColor: "divider", mt: 3 }}>
      <Typography className="App-header" variant="h4" sx={{  fontWeight: "bold" }} align="center">The Last Land</Typography>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          centered
          textColor="secondary"
          indicatorColor="secondary"
          sx={{
            "& .MuiTab-root": {
              fontWeight: "bold",
              fontSize: "1rem",
              textTransform: "none",
              px: 4,
              py: 2
            },
            "& .Mui-selected": {
              color: "#1976d2"
            }
          }}
        >
          <Tab label="Stats" />
          <Tab label="Formation" />
          <Tab label="Report" />
        </Tabs>
      </Box>

      {activeTab === 0 && <StatsPage />}
      {activeTab === 1 && <FormationPage groupedData={groupedData} groupedCavalryData={groupedCavalry}thresholds={thresholds} />}
      {activeTab === 2 && <ReportPage />}
    </Container>
  );
}