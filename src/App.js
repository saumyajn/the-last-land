import './App.css'
import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Container,
  Stack,
  Tabs,
  Tab,
  Typography
} from "@mui/material";
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import StatsPage from './components/StatsPage';
import FormationPage from "./components/FormationPage";
import ReportPage from "./components/ReportPage";
import AnalyticsPage from './components/AnalyticsPage'
import { db } from "./utils/firebase";
import { getRedirectResult, getAuth , onAuthStateChanged} from "firebase/auth";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { signInWithGoogle, logout, onUserChange} from './utils/auth';
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
    const unsubscribe = onUserChange((user) => {
      console.log(user ? "✅ Logged in" : "❌ Logged out", user);
      setUser(user);
      setIsAdmin(ADMIN_EMAILS.includes(user?.email));
    });
    return () => unsubscribe();
  }, []);
  useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      console.log("🔥 Firebase auth state changed:", user);
    });
    getRedirectResult(auth)
      .then((result) => {
        console.log("🔁 Redirect result received:", result);
        if (result?.user) {
          console.log("✅ Redirect complete. User logged in:", result.user);
          // Optionally store user in state/context
        } else {
          console.log("ℹ️ No user from redirect");
        }
      })
      .catch((error) => {
        console.error("❌ Redirect error:", error);
      });
  }, []);
  useEffect(() => {
    const unsubscribe = onUserChange((user) => {
      if (user) {
        console.log("👤 Logged in:", user.displayName);
        setUser(user); // set state or context
      } else {
        console.log("👤 Logged out");
      }
    });

    return () => unsubscribe();
  }, []);
  useEffect(() => {

    const fetchThresholdsAndData = async () => {
      // onUserChange().then((user) => {
      //   setUser(user);
      //   setIsAdmin(user && ADMIN_EMAILS.includes(user.email))
      // })
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

          // Archer grouping
          const archerVal = parseFloat(playerData["Final Archer Damage"]) || 0;
          const archerMatch = tData
            .slice()
            .sort((a, b) => b.limit - a.limit)
            .find((t) => archerVal >= t.limit);

          const archerColor = archerMatch ? archerMatch.color : "default";

          if (!newGroupedData[archerColor]) newGroupedData[archerColor] = [{ "colorName": colorNames[archerColor] || archerColor }];
          newGroupedData[archerColor].push(
            { name: playerName, damage: archerVal }
          );

          // Cavalry grouping
          const cavalryVal = parseFloat(playerData["Final Cavalry Damage"]) || 0;
          const cavalryMatch = tData
            .slice()
            .sort((a, b) => b.limit - a.limit)
            .find((t) => cavalryVal >= t.limit);
          const cavalryColor = cavalryMatch ? cavalryMatch.color : "default";
          if (!newGroupedCavalryData[cavalryColor]) newGroupedCavalryData[cavalryColor] = [{ "colorName": colorNames[cavalryColor] || cavalryColor }];
          newGroupedCavalryData[cavalryColor].push({ name: playerName, damage: cavalryVal });
        });

        // Set average damage
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
              <Button size="small" variant="outlined" color="secondary" onClick={logout}><LogoutIcon /></Button>
            </Stack>
          ) : (
            <Button color="inherit" onClick={() => signInWithGoogle()}><LoginIcon /></Button>
          )}


        </Box>
        <Typography variant="h4" sx={{ fontWeight: "bold" }} align="center">The Last Land

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