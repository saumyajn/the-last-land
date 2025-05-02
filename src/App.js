import './App.css';
import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Container,
  Stack,
  Paper,
  Tabs,
  Tab,
  Typography
} from "@mui/material";
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import StatsPage from './components/stats/StatsPage';
import FormationPage from "./components/formation/FormationPage";
import ReportPage from "./components/report/ReportPage";
import AnalyticsPage from './components/analytics/AnalyticsPage';
import { db } from "./utils/firebase";
import { getRedirectResult, getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { signInWithGoogle, logout } from './utils/auth';
import { ADMIN_EMAILS } from './utils/config';

export default function App() {
  const [activeTab, setActiveTab] = useState(3);
  const [groupedData, setGroupedData] = useState({});
  const [groupedCavalry, setGroupedCavalryData] = useState({});
  const [thresholds, setThresholds] = useState([]);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("🔥 Auth state changed:", firebaseUser);
      setUser(firebaseUser);
      setIsAdmin(firebaseUser && ADMIN_EMAILS.includes(firebaseUser.email));

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
    <Container maxWidth="xl" sx={{ paddingLeft: 0 }}>
      <Box className="App-header">
        <Box sx={{ position: "absolute", top: 0, right: 0, p: 2 }}>
          {user ? (
            <Stack direction="row" alignItems="center">
              <Typography>{user.displayName} ({isAdmin ? "Admin" : "View only"})</Typography>
              <Button size="small"  color="inherit" onClick={logout}><LogoutIcon /></Button>
            </Stack>
          ) : (
            <Button size="small" variant="outlined" color="inherit" onClick={() => signInWithGoogle()}><LoginIcon /></Button>
          )}
        </Box>
        <Typography variant="h4" sx={{ fontWeight: "bold" }} align="center">The Last Land</Typography>
      </Box>
      <Box component={Paper} sx={{ mt: 3, p: 2 }}>
        <Typography variant="h5" gutterBottom>About This App</Typography>
        <Typography variant="body1">
          <b>The Last Land</b> is a custom-built analytics and stats dashboard designed to help strategy game players optimize performance.
          Users can track damage statistics, unit formations, and customize thresholds for performance tiers.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Built using <b>React</b>, <b>Firebase Auth</b>, and <b>Firestore</b> with role-based access and real-time updates.
        </Typography>
      </Box>
      <Box>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
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
          <Tab label="Analytics" />
        </Tabs>
      </Box>

      {activeTab === 0 && <StatsPage isAdmin={isAdmin} />}
      {activeTab === 1 && <FormationPage groupedData={groupedData} groupedCavalryData={groupedCavalry} thresholds={thresholds} isAdmin={isAdmin} />}
      {activeTab === 2 && <ReportPage isAdmin={isAdmin} />}
      {activeTab === 3 && <AnalyticsPage isAdmin={isAdmin} />}
    </Container>
  );
}