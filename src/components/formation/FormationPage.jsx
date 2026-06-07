import React, { useContext, useState, useEffect } from "react";
import {
  Box, Typography, Stack, Grid, Paper, Accordion,
  AccordionSummary, AccordionDetails, Divider, IconButton, Tooltip, CircularProgress
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FormationForm from "./FormationForm";
import FormationTable from "./FormationTable";
import { AuthContext } from "../../utils/authContext";

// 🔥 Added Firebase imports
import { db } from "../../utils/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { getRenderableThresholdColor, normalizeThresholds } from "../../utils/colorUtils";

export default function FormationPage() {
  const { isAdmin } = useContext(AuthContext);

  // 🔥 Moved all state here from App.js
  const [groupedData, setGroupedData] = useState({});
  const [groupedCavalryData, setGroupedCavalryData] = useState({});
  const [groupedAverageData, setGroupedAverageData] = useState({});
  const [thresholds, setThresholds] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form1, setForm1] = useState({ total: "", guards: "", damage_troops: "", at10: "", at9: "", at8: "", at7: "", ct10: "", ct9: "", ct8: "", ct7: "" });
  const [form2, setForm2] = useState({ total: "", guards: "", damage_troops: "", at10: "", at9: "", at8: "", at7: "", ct10: "", ct9: "", ct8: "", ct7: "" });

  // 🔥 Moved the fetch logic here! It now runs fresh every time this page opens.
  useEffect(() => {
    const fetchThresholdsAndData = async () => {
      setLoading(true);
      try {
        const thresholdsRef = doc(db, "settings", "thresholds");
        const thresholdsSnap = await getDoc(thresholdsRef);
        if (!thresholdsSnap.exists()) return;

        const tData = normalizeThresholds(thresholdsSnap.data().thresholds);
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
          const avgVal = parseFloat((data["Average Damage"])) || 0;

          // Archer grouping
          const archerMatch = tData.slice().sort((a, b) => b.limit - a.limit).find(t => archerVal >= t.limit);
          const archerColor = archerMatch?.color || "default";
          if (!newGroupedData[archerColor]) newGroupedData[archerColor] = [{ colorName: colorNames[archerColor] || archerColor }];
          newGroupedData[archerColor].push({ name: playerName, damage: archerVal });

          // Cavalry grouping
          const cavalryMatch = tData.slice().sort((a, b) => b.limit - a.limit).find(t => cavalryVal >= t.limit);
          const cavalryColor = cavalryMatch?.color || "default";
          if (!newGroupedCavalryData[cavalryColor]) newGroupedCavalryData[cavalryColor] = [{ colorName: colorNames[cavalryColor] || cavalryColor }];
          newGroupedCavalryData[cavalryColor].push({ name: playerName, damage: cavalryVal });

          // Average grouping (🔥 With Safety Check added)

          const avgMatch = tData.slice().sort((a, b) => b.limit - a.limit).find(t => avgVal >= t.limit);
          const avgColor = avgMatch?.color || "default";
          if (!newGroupedAverageData[avgColor]) newGroupedAverageData[avgColor] = [{ colorName: colorNames[avgColor] || avgColor }];
          newGroupedAverageData[avgColor].push({ name: playerName, damage: avgVal });
        });

        // Calculate Average math
        const computeAverages = (group) => {
          for (const color in group) {
            const players = group[color].filter(p => typeof p === "object" && "damage" in p);
            if (players.length > 0) {
              const total = players.reduce((sum, p) => sum + (p.damage || 0), 0);
              const avg = total / players.length;
              group[color][0].avgDamage = parseFloat(avg.toFixed(2));
            }
          }
        };

        computeAverages(newGroupedData);
        computeAverages(newGroupedCavalryData);
        computeAverages(newGroupedAverageData);

        setGroupedData(newGroupedData);
        setGroupedCavalryData(newGroupedCavalryData);
        setGroupedAverageData(newGroupedAverageData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchThresholdsAndData();
  }, []); // Runs once every time the Formation component mounts

  const colorSortOrder = thresholds?.map(t => t.color) || [];
  const getSortedGroups = (data) => Object.keys(data).sort((a, b) => colorSortOrder.indexOf(b) - colorSortOrder.indexOf(a));

  const handleCopy = (players, color) => {
    const groupName = players[0]?.colorName || color;
    const text = players.slice(1).map(p => ` ${p.name || p}`).join(", ");
    navigator.clipboard.writeText(`${groupName}- ${text}`);
  };

  const sectionStyles = {
    mb: 3,
    p: { xs: 1.5, md: 2.5 },
    borderRadius: 2,
    backgroundColor: "background.paper",
    border: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "0 18px 45px rgba(15,23,42,0.06)",
  };

  const paperStyles = {
    p: { xs: 1.5, md: 2 },
    borderRadius: 2,
    backgroundColor: "background.paper",
    border: "1px solid rgba(15,23,42,0.08)",
  };

  const titleStyles = { mb: 2, fontWeight: 800, color: "text.primary" };

  const renderGroupAccordion = (label, data) => {
    if (!data || Object.keys(data).length === 0) return null;

    const groups = getSortedGroups(data);
    return (
      <Accordion
        disableGutters
        sx={{
          mb: 2,
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
          "&:before": { display: "none" },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "background.paper" }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary" }}>{label}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {groups.map((color) => {
            const meta = data[color];
            const colorName = meta[0]?.colorName || color;
            const avgDamage = Math.round(meta[0]?.avgDamage || 0);
            const displayColor = getRenderableThresholdColor(color);

            if (!meta || meta.length <= 1) return null;

            return (
              <Paper key={color} elevation={0} sx={{ mb: 1.5, borderLeft: `6px solid ${displayColor}`, p: 1.5, bgcolor: alpha(displayColor, 0.50), borderRadius: 2, border: "1px solid rgba(15,23,42,0.06)" }}>
                <Typography variant="subtitle2" sx={{ ml: 0.5, fontWeight: 800 }}>
                  {colorName.toUpperCase()} - Avg Damage: {avgDamage}
                </Typography>
                <Divider sx={{ my: 0.5 }} />
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                  {meta.slice(1).map((player, idx) => (
                    <Box key={idx} sx={{ backgroundColor: "rgba(255,255,255,0.78)", px: 1.25, py: 0.5, borderRadius: 1, fontSize: 14, color: "text.primary", fontWeight: 700, border: "1px solid rgba(15,23,42,0.08)" }}>
                      {player.name || player}
                    </Box>
                  ))}
                  <Tooltip title="Copy names">
                    <IconButton size="small" onClick={() => handleCopy(meta, color)}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Paper>
            );
          })}
        </AccordionDetails>
      </Accordion>
    );
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ mt: 3 }}>
      {renderGroupAccordion("Final Archer Damage", groupedData)}
      {renderGroupAccordion("Final Cavalry Damage", groupedCavalryData)}
      {renderGroupAccordion("Average Damage", groupedAverageData)}

      <Divider sx={{ mb: 3 }} />

      <Box sx={sectionStyles}>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5, color: "text.primary" }}>
          TOWER FORMATION
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Editable tower troop distribution with saved Last Land formation values.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Paper elevation={0} sx={paperStyles}>
              <Typography variant="h6" sx={titleStyles}>Formation</Typography>
              <FormationForm label="Tower Formation" formState={form1} setFormState={setForm1} isAdmin={isAdmin} />
              <FormationTable label="tower_formation" groupedData={groupedAverageData} isAdmin={isAdmin} />
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Box sx={sectionStyles}>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5, color: "text.primary" }}>
          THRONE FORMATION
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Editable throne troop distribution with the same saved calculation workflow.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Paper elevation={0} sx={paperStyles}>
              <Typography variant="h6" sx={titleStyles}>Formation</Typography>
              <FormationForm label="Throne Formation" formState={form2} setFormState={setForm2} isAdmin={isAdmin} />
              <FormationTable label="throne_formation" groupedData={groupedAverageData} isAdmin={isAdmin} />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
