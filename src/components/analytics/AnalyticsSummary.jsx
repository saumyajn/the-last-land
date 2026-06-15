import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";
import {
  Box,
  Chip,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TableSortLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { computeKPT, computeLPT, sumReportEntries } from "../../utils/kptCalculations";

const formatMetric = (value) => Number(value || 0).toFixed(2);

const getAverageMetricValue = (data, key) => {
  const rows = data.filter(row => parseFloat(row[key]) > 0);
  if (rows.length === 0) return 0;
  return rows.reduce((sum, row) => sum + parseFloat(row[key] || 0), 0) / rows.length;
};

const isWithinBand = (value, average) => {
  if (average <= 0) return value === 0;
  const lower = average * 0.9;
  const upper = average * 1.1;
  return value >= lower && value <= upper;
};

function PerformanceChart({ title, data, kptKey, lptKey }) {
  const kptAverage = getAverageMetricValue(data, kptKey);
  const lptAverage = getAverageMetricValue(data, lptKey);
  const chartRows = data
    .map((row) => ({
      name: row.name,
      kpt: parseFloat(row[kptKey]) || 0,
      lpt: parseFloat(row[lptKey]) || 0,
    }))
    .filter((row) => row.kpt > 0 || row.lpt > 0);

  if (!chartRows.length) return null;

  const maxMetric = Math.max(1, ...chartRows.flatMap(row => [row.kpt, row.lpt]));
  const getBarColor = (good) => good ? "#16a34a" : "#dc2626";
  const getBarWidth = (value) => `${Math.max(4, (value / maxMetric) * 100)}%`;

  return (
    <Accordion disableGutters sx={{ mt: 2, borderRadius: 2, border: "1px solid rgba(15,23,42,0.08)", overflow: "hidden", boxShadow: "none", "&:before": { display: "none" } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: "#f8fafc" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap", width: "100%" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
            {title} KPT/LPT Performance Chart
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mr: 1 }}>
            <Chip size="small" label={`KPT avg ${formatMetric(kptAverage)}`} color="success" variant="outlined" />
            <Chip size="small" label={`LPT avg ${formatMetric(lptAverage)}`} color="success" variant="outlined" />
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ backgroundColor: "#f8fafc", p: 2 }}>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
          <Chip size="small" label="Green = within 10%" sx={{ backgroundColor: "rgba(22,163,74,0.12)", color: "#166534", fontWeight: 700 }} />
          <Chip size="small" label="Red = outside 10%" sx={{ backgroundColor: "rgba(220,38,38,0.10)", color: "#991b1b", fontWeight: 700 }} />
        </Box>
        <Box sx={{ display: "grid", gap: 1 }}>
          {chartRows.map((row) => {
            const kptGood = isWithinBand(row.kpt, kptAverage);
            const lptGood = isWithinBand(row.lpt, lptAverage);
            return (
              <Box
                key={row.name}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "110px 1fr" },
                  gap: { xs: 0.75, sm: 1.25 },
                  alignItems: "center",
                  p: 1,
                  borderRadius: 1.5,
                  backgroundColor: "#ffffff",
                  border: "1px solid rgba(15,23,42,0.06)",
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 800, color: "text.primary" }}>
                  {row.name}
                </Typography>
                <Box sx={{ display: "grid", gap: 0.75 }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: "42px 1fr 48px", gap: 1, alignItems: "center" }}>
                    <Typography variant="caption" sx={{ fontWeight: 900, color: "text.secondary" }}>
                      KPT
                    </Typography>
                    <Box
                      title={`${row.name} KPT ${formatMetric(row.kpt)} (${kptGood ? "within" : "outside"} 10% of avg ${formatMetric(kptAverage)})`}
                      sx={{
                        height: 12,
                        borderRadius: 1,
                        backgroundColor: "rgba(15,23,42,0.08)",
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        sx={{
                          width: getBarWidth(row.kpt),
                          height: "100%",
                          backgroundColor: getBarColor(kptGood),
                          borderRadius: 1,
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                      {formatMetric(row.kpt)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "grid", gridTemplateColumns: "42px 1fr 48px", gap: 1, alignItems: "center" }}>
                    <Typography variant="caption" sx={{ fontWeight: 900, color: "text.secondary" }}>
                      LPT
                    </Typography>
                    <Box
                      title={`${row.name} LPT ${formatMetric(row.lpt)} (${lptGood ? "within" : "outside"} 10% of avg ${formatMetric(lptAverage)})`}
                      sx={{
                        height: 12,
                        borderRadius: 1,
                        backgroundColor: "rgba(15,23,42,0.08)",
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        sx={{
                          width: getBarWidth(row.lpt),
                          height: "100%",
                          backgroundColor: getBarColor(lptGood),
                          borderRadius: 1,
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                      {formatMetric(row.lpt)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
export default function AnalyticsSummary({ isAdmin }) {
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "desc" });

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
          const archerKeys = troopTypes
            .filter(([key]) => key.includes("archer"))
            .map(([key]) => key);

          const cavalryKeys = troopTypes
            .filter(([key]) => key.includes("cavalry"))
            .map(([key]) => key);

          const archerTotals = sumReportEntries(data, archerKeys);
          const cavalryTotals = sumReportEntries(data, cavalryKeys);
          const archerTroops = archerTotals.Losses + archerTotals.Wounded + archerTotals.Survivors;
          const cavalryTroops = cavalryTotals.Losses + cavalryTotals.Wounded + cavalryTotals.Survivors;
          const archerKPT = computeKPT(archerTotals.Kills, archerTotals.Losses, archerTotals.Wounded, archerTotals.Survivors);
          const cavalryKPT = computeKPT(cavalryTotals.Kills, cavalryTotals.Losses, cavalryTotals.Wounded, cavalryTotals.Survivors);
          const archerLPT = computeLPT(archerTotals.Losses, archerTotals.Wounded, archerTotals.Survivors);
          const cavalryLPT = computeLPT(cavalryTotals.Losses, cavalryTotals.Wounded, cavalryTotals.Survivors);
          return {
            name,
            archerKills: archerTotals.Kills,
            archerTroops,
            cavalryKills: cavalryTotals.Kills,
            cavalryTroops,
            archerDamage: statsMap[name]?.archerDamage || 0,
            cavalryDamage: statsMap[name]?.cavalryDamage || 0,
            archerKPT,
            archerLPT,
            cavalryKPT,
            cavalryLPT
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

        const archerRanks = calculateColumnRanks(summary, ["archerKills", "archerTroops", "archerKPT", "archerLPT", "archerDamage"]);
        const cavalryRanks = calculateColumnRanks(summary, ["cavalryKills", "cavalryTroops", "cavalryKPT", "cavalryLPT", "cavalryDamage"]);

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
            lpt: player.archerLPT,
            damage: player.archerDamage
          };
          cavalryFinal[player.name] = {
            kills: player.cavalryKills,
            troops: player.cavalryTroops,
            kpt: player.cavalryKPT,
            lpt: player.cavalryLPT,
            damage: player.cavalryDamage
          };
        });
        if (!isAdmin) {
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
  }, [isAdmin]);

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

  const renderRankedTable = (title, data, keys, prefix, metricKeys) => {

    const averageMetric = (data, key) => {
      return getAverageMetricValue(data, key).toFixed(2);
    };

    const sorted = applySorting(data, prefix);
    return (
      <Paper elevation={0} sx={{ borderRadius: 2, width: "100%", p: { xs: 1.5, md: 2 }, border: "1px solid rgba(15,23,42,0.08)", boxShadow: "0 14px 34px rgba(15,23,42,0.05)" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
          <Typography variant="h6" color="primary.dark" sx={{ fontWeight: 900 }}>{title}</Typography>
          {metricKeys.map(metricKey => (
              <Chip
                key={metricKey}
                label={`Average ${metricKey.toUpperCase()}: ${averageMetric(data, metricKey)}`}
                color="secondary"
                variant="outlined"
                sx={{ fontWeight: "bold", backgroundColor: '#f0f0f0', color: 'secondary.main' }}
              />
            ))}
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
                         {row[key]} <small className="small-muted">(#{row[`${key}Rank`]})</small>

                       </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <PerformanceChart
            title={title.replace(" Summary", "")}
            data={sorted}
            kptKey={metricKeys[0]}
            lptKey={metricKeys[1]}
          />
      </Paper>
    );
  };

  return (
    <Grid spacing={2} container>
       <Grid item size={{xs:12, md:6}} sx={{ mb: 2 }}>
        {renderRankedTable("Cavalry Summary", summaryData, ["cavalryKills", "cavalryTroops", "cavalryKPT", "cavalryLPT", "cavalryDamage"], "cavalry", ["cavalryKPT", "cavalryLPT"])}
      </Grid>
       <Grid item size={{xs:12, md:6}} sx={{ mb: 2 }}>
        {renderRankedTable("Archer Summary", summaryData, ["archerKills", "archerTroops", "archerKPT", "archerLPT", "archerDamage"], "archer", ["archerKPT", "archerLPT"])}
      </Grid>
    </Grid>
  );
}
