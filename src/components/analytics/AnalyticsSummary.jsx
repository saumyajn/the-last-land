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

const performanceColors = {
  green: {
    bg: "#16a34a",
    soft: "rgba(22,163,74,0.12)",
    text: "#166534",
  },
  yellow: {
    bg: "#f59e0b",
    soft: "rgba(245,158,11,0.16)",
    text: "#92400e",
  },
  red: {
    bg: "#dc2626",
    soft: "rgba(220,38,38,0.10)",
    text: "#991b1b",
  },
};

const getPerformanceStatus = (value, average, metricType) => {
  if (average <= 0) return "yellow";

  const lower = average * 0.9;
  const upper = average * 1.1;

  if (metricType === "kpt") {
    if (value > upper) return "green";
    if (value < lower) return "red";
    return "yellow";
  }

  if (value > upper) return "red";
  if (value < lower) return "green";
  return "yellow";
};

const getPointStatus = (kpt, lpt, kptAverage, lptAverage) => {
  const kptStatus = getPerformanceStatus(kpt, kptAverage, "kpt");
  const lptStatus = getPerformanceStatus(lpt, lptAverage, "lpt");

  if (kptStatus === "green" && lptStatus === "green") return "green";
  if (kptStatus === "red" || lptStatus === "red") return "red";
  return "yellow";
};

const getPointStatusLabel = (status) => {
  if (status === "green") return "Strong: high KPT and low LPT";
  if (status === "red") return "Risk: low KPT or high LPT";
  return "Average band or mixed result";
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

  const getScore = (row) => {
    const kptScore = kptAverage > 0 ? row.kpt / kptAverage : 0;
    const lptScore = lptAverage > 0 ? row.lpt / lptAverage : 0;
    return kptScore - lptScore;
  };
  const groupedRows = chartRows.reduce((groups, row) => {
    const status = getPointStatus(row.kpt, row.lpt, kptAverage, lptAverage);
    groups[status].push({ ...row, status, score: getScore(row) });
    return groups;
  }, { green: [], yellow: [], red: [] });
  Object.values(groupedRows).forEach((rows) => rows.sort((a, b) => b.score - a.score));
  const bandConfig = [
    { key: "green", title: "Strong", helper: "High KPT + low LPT" },
    { key: "yellow", title: "Average / Mixed", helper: "Around average or split result" },
    { key: "red", title: "Risk", helper: "Low KPT or high LPT" },
  ];

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
      <AccordionDetails sx={{ backgroundColor: "#f8fafc", p: 1.5 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 1.25 }}>
          {bandConfig.map((band) => {
            const color = performanceColors[band.key];
            const rows = groupedRows[band.key];

            return (
              <Box
                key={band.key}
                sx={{
                  minHeight: 170,
                  borderRadius: 2,
                  border: `1px solid ${color.soft}`,
                  backgroundColor: "#ffffff",
                  overflow: "hidden",
                }}
              >
                <Box sx={{ p: 1.25, backgroundColor: color.soft, borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: color.text }}>
                      {band.title}
                    </Typography>
                    <Chip size="small" label={rows.length} sx={{ height: 22, color: color.text, backgroundColor: "#ffffff", fontWeight: 900 }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: color.text, fontWeight: 700 }}>
                    {band.helper}
                  </Typography>
                </Box>
                <Box sx={{ display: "grid", gap: 0.75, p: 1 }}>
                  {rows.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                      No players
                    </Typography>
                  ) : rows.map((row) => (
                    <Box
                      key={row.name}
                      title={`${row.name}: KPT ${formatMetric(row.kpt)}, LPT ${formatMetric(row.lpt)} - ${getPointStatusLabel(row.status)}`}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto auto",
                        alignItems: "center",
                        gap: 0.75,
                        p: 0.75,
                        borderRadius: 1.25,
                        border: "1px solid rgba(15,23,42,0.07)",
                        backgroundColor: "#fbfdff",
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.name}
                      </Typography>
                      <Chip size="small" label={`K ${formatMetric(row.kpt)}`} sx={{ height: 22, fontWeight: 800, color: performanceColors[getPerformanceStatus(row.kpt, kptAverage, "kpt")].text, backgroundColor: performanceColors[getPerformanceStatus(row.kpt, kptAverage, "kpt")].soft }} />
                      <Chip size="small" label={`L ${formatMetric(row.lpt)}`} sx={{ height: 22, fontWeight: 800, color: performanceColors[getPerformanceStatus(row.lpt, lptAverage, "lpt")].text, backgroundColor: performanceColors[getPerformanceStatus(row.lpt, lptAverage, "lpt")].soft }} />
                    </Box>
                  ))}
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
       <Grid item size={{xs:12}} sx={{ mb: 2 }}>
        {renderRankedTable("Cavalry Summary", summaryData, ["cavalryKills", "cavalryTroops", "cavalryKPT", "cavalryLPT", "cavalryDamage"], "cavalry", ["cavalryKPT", "cavalryLPT"])}
      </Grid>
       <Grid item size={{xs:12}} sx={{ mb: 2 }}>
        {renderRankedTable("Archer Summary", summaryData, ["archerKills", "archerTroops", "archerKPT", "archerLPT", "archerDamage"], "archer", ["archerKPT", "archerLPT"])}
      </Grid>
    </Grid>
  );
}
