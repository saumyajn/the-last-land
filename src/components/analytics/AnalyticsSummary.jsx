import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";
import {
  Box,
  Chip,
  Grid,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TableSortLabel,
  Divider
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { getAuth } from "firebase/auth";

export default function AnalyticsSummary({ isAdmin }) {
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "desc" });
  const auth = getAuth();
  const currentUser = auth.currentUser;
  useEffect(() => {
    const fetchAllPlayerStats = async () => {
      try {
        const [reportSnap, statSnap] = await Promise.all([
          getDocs(collection(db, "reports")),
          getDocs(collection(db, "stats"))
        ]);

        const statsMap = {};
        statSnap.docs.forEach(doc => {
          const data = doc.data();
          statsMap[doc.id] = {
            archerDamage: parseFloat(data["Final Archer Damage"] || 0),
            cavalryDamage: parseFloat(data["Final Cavalry Damage"] || 0)
          };
        });

        const summary = reportSnap.docs.map(docSnap => {
          const name = docSnap.id;
          const data = docSnap.data();

          const troopTypes = Object.entries(data);
          const archerKills = troopTypes
            .filter(([key]) => key.includes("archer"))
            .reduce((sum, [_, val]) => sum + parseInt(val.Kills || "0"), 0);

          const cavalryKills = troopTypes
            .filter(([key]) => key.includes("cavalry"))
            .reduce((sum, [_, val]) => sum + parseInt(val.Kills || "0"), 0);
          //(kills-(losses+wounded))/survivors
          const archerTroops = troopTypes
            .filter(([key]) => key.includes("archer"))
            .reduce((sum, [_, val]) => sum + parseInt(val.Losses || 0) + parseInt(val.Wounded || 0) + parseInt(val.Survivors || 0), 0);

          const cavalryTroops = troopTypes
            .filter(([key]) => key.includes("cavalry"))
            .reduce((sum, [_, val]) => sum + parseInt(val.Losses || 0) + parseInt(val.Wounded || 0) + parseInt(val.Survivors || 0), 0);

          const archerKPT = archerTroops ? (archerKills / archerTroops).toFixed(2) : "0.00";
          const cavalryKPT = cavalryTroops ? (cavalryKills / cavalryTroops).toFixed(2) : "0.00";
          return {
            name,
            archerKills,
            archerTroops,
            cavalryKills,
            cavalryTroops,
            archerDamage: statsMap[name]?.archerDamage || 0,
            cavalryDamage: statsMap[name]?.cavalryDamage || 0,
            archerKPT,
            cavalryKPT
          };
        });

        const calculateColumnRanks = (data, keys) => {
          const ranksMap = {};
          keys.forEach(key => {
            const sorted = [...data].sort((a, b) => parseFloat(b[key]) - parseFloat(a[key]));
            sorted.forEach((item, index) => {
              if (!ranksMap[item.name]) ranksMap[item.name] = {};
              ranksMap[item.name][`${key}Rank`] = index + 1;
            });
          });
          return ranksMap;
        };

        const archerRanks = calculateColumnRanks(summary, ["archerKills", "archerTroops", "archerKPT", "archerDamage"]);
        const cavalryRanks = calculateColumnRanks(summary, ["cavalryKills", "cavalryTroops", "cavalryKPT", "cavalryDamage"]);

        const rankedSummary = summary.map(player => ({
          ...player,
          ...archerRanks[player.name],
          ...cavalryRanks[player.name]
        }));

        setSummaryData(rankedSummary);

        const archerFinal = {};
        const cavalryFinal = {};

        rankedSummary.forEach(player => {
          archerFinal[player.name] = {
            kills: player.archerKills,
            troops: player.archerTroops,
            kpt: player.archerKPT,
            damage: player.archerDamage
          };
          cavalryFinal[player.name] = {
            kills: player.cavalryKills,
            troops: player.cavalryTroops,
            kpt: player.cavalryKPT,
            damage: player.cavalryDamage
          };
        });
        if (!currentUser) {
          return;
        }
        await Promise.all([
          setDoc(doc(db, "analytics", "archer_final"), archerFinal),
          setDoc(doc(db, "analytics", "cavalry_final"), cavalryFinal)
        ]);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllPlayerStats();
  }, []);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      } else {
        return { key, direction: "desc" };
      }
    });
  };

  const applySorting = (data, keyPrefix) => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      const aVal = parseFloat(a[sortConfig.key]);
      const bVal = parseFloat(b[sortConfig.key]);
      return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
    });
  };

  if (loading) return <Typography>Loading data...</Typography>;

  const renderRankedTable = (title, data, keys, prefix, kptKey) => {

    const averageKPT = (data, key) => (
      data.reduce((sum, row) => sum + parseFloat(row[key] || 0), 0) /
      data.filter(row => parseFloat(row[key]) > 0).length
    ).toFixed(2);

    const sorted = applySorting(data, prefix);
    return (
      <Accordion defaultExpanded sx={{ borderRadius: 2,  width: '100%'  }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{
          bgcolor: '#d6e8fc', // You can change to any MUI theme color or hex
          color: 'white'
        }}>
          <Typography variant="h6" gutterBottom color="primary">{title} </Typography>

        </AccordionSummary>

        <AccordionDetails>
          <Box sx={{ mb: 2 }}>
            <Chip
              label={`Average ${kptKey.toUpperCase()}: ${averageKPT(data, kptKey)}`}
              color="info"
              variant="outlined"
              sx={{ fontWeight: "bold" }}
            />
          </Box>
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><b>Rank</b></TableCell>
                  <TableCell><b>Player</b></TableCell>
                  {keys.map(key => (
                    <TableCell key={key} >
                      <TableSortLabel
                        active={sortConfig.key === key}
                        direction={sortConfig.key === key ? sortConfig.direction : "asc"}
                        onClick={() => handleSort(key)}
                      >
                        <b>{key}</b>
                      </TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {sorted.map((row, index) => (
                  <TableRow key={row.name} hover>
                    <TableCell>{index + 1}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{row.name}</TableCell>
                    {keys.map(key => (
                      <TableCell key={key}>
                         {row[key]} <small style={{ color: "#313131" }}>(#{row[`${key}Rank`]})</small>
                 
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>
    );
  };

  return (
    <Grid  spacing={4}>
       <Grid item xs={12} sx={{ mb: 2 }}>
        {renderRankedTable("Cavalry Summary", summaryData, ["cavalryKills", "cavalryTroops", "cavalryKPT", "cavalryDamage"], "cavalry", "cavalryKPT")}
      </Grid>
       <Grid item xs={12}>
        {renderRankedTable("Archer Summary", summaryData, ["archerKills", "archerTroops", "archerKPT", "archerDamage"], "archer", "archerKPT")}
      </Grid>
    </Grid>
  );
}