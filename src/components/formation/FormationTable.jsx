import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  Box,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tooltip,
  IconButton,
  Button
} from "@mui/material";
import { db } from "../../utils/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { usePermissionSnackbar } from "../Permissions";
import { normalizeThresholds } from "../../utils/colorUtils";

const troopValueFields = ["at10", "at9", "at8", "at7", "ct10", "ct9", "ct8", "ct7"];
const MathRound = (num) => Math.round(num * 2) / 2;

const getSavedOrCalculatedValue = (data, key, calculatedValue) => {
  if (data[key] === undefined || data[key] === null || data[key] === "") {
    return calculatedValue;
  }
  const value = parseFloat(data[key]);
  return Number.isNaN(value) ? calculatedValue : value;
};

const getMarchSize = (row) => troopValueFields.reduce((sum, field) => sum + (parseFloat(row[field]) || 0), 0);

const getZeroTroopValues = () => ({
  troops: 0,
  at10: 0,
  at9: 0,
  at8: 0,
  at7: 0,
  ct10: 0,
  ct9: 0,
  ct8: 0,
  ct7: 0,
  marchSize: 0,
  total: 0,
});

const buildFormationPayload = (rows) => {
  const payload = {};
  rows.forEach(row => {
    payload[row.group] = {
      avgDamage: row.damage,
      count: row.count,
      troops: row.troops,
      at10: row.at10,
      at9: row.at9,
      at8: row.at8,
      at7: row.at7,
      ct10: row.ct10,
      ct9: row.ct9,
      ct8: row.ct8,
      ct7: row.ct7,
      marchSize: row.marchSize,
      total: row.total
    };
  });
  return payload;
};

export default function FormationTable({ label, groupedData = null, isAdmin, type, recalculateToken = 0 }) {
  const [totalTroopValue, setTotalTroopValue] = useState(0);
  const [ratios, setRatios] = useState({ at10: 0, at9: 0, at8: 0, at7: 0, ct10: 0, ct9: 0, ct8: 0, ct7: 0 });
  const [rows, setRows] = useState([]);
  const [isEdited, setIsEdited] = useState(false);
  const previousGroupedData = useRef(null);
  const previousRecalculateToken = useRef(recalculateToken);
  const { showNoPermission } = usePermissionSnackbar();

  const settingDocName = useMemo(
    () => label.toLowerCase().includes("throne") ? "throne_formation" : "tower_formation",
    [label]
  );


  const loadFormationData = useCallback(async () => {
    try {

      const [settingSnap, formationSnap, thresholdsSnap] = await Promise.all([
        getDoc(doc(db, "settings", settingDocName)),
        getDoc(doc(db, "formation", `${label}`)),
        getDoc(doc(db, "settings", "thresholds"))
      ]);

      const settingData = settingSnap.exists() ? settingSnap.data() : {};
      const formationData = formationSnap.exists() ? formationSnap.data() : {};
      const thresholdData = thresholdsSnap.exists() ? normalizeThresholds(thresholdsSnap.data().thresholds) : [];
      const colorOrder = thresholdData.map(t => t.name);
      const shouldForceRecalculate = previousRecalculateToken.current !== recalculateToken;

      const totalTroops = parseFloat(settingData.damage_troops || 0);

      setTotalTroopValue(totalTroops);
      setRatios({
        at10: settingData.at10 / 100,
        at9: settingData.at9 / 100,
        at8: settingData.at8 / 100,
        at7: settingData.at7 / 100,
        ct10: settingData.ct10 / 100,
        ct9: settingData.ct9 / 100,
        ct8: settingData.ct8 / 100,
        ct7: settingData.ct7 / 100
      });

      const totalDamage = Object.values(formationData).reduce(
        (sum, item) => (!isNaN(item.avgDamage) && item.avgDamage > 0)
          ? sum + item.avgDamage * (item.count || 0)
          : sum,
        0
      );
      let formattedRows = Object.entries(formationData).map(([group, data]) => {
        const count = data.count || 0;
        const damage = data.avgDamage || 0;
        const share = totalDamage > 0 && damage > 0 ? (damage) / totalDamage : 0;
        const troops = parseFloat((totalTroops * share).toFixed(2));

        const calculatedAt10 = MathRound((troops * (settingData.at10 || 0) / 100) / 1000);
        const calculatedAt9 = MathRound((troops * (settingData.at9 || 0) / 100) / 1000);
        const calculatedAt8 = MathRound((troops * (settingData.at8 || 0) / 100) / 1000);
        const calculatedAt7 = MathRound((troops * (settingData.at7 || 0) / 100) / 1000);

        const calculatedCt10 = MathRound((troops * (settingData.ct10 || 0) / 100) / 1000);
        const calculatedCt9 = MathRound((troops * (settingData.ct9 || 0) / 100) / 1000);
        const calculatedCt8 = MathRound((troops * (settingData.ct8 || 0) / 100) / 1000);
        const calculatedCt7 = MathRound((troops * (settingData.ct7 || 0) / 100) / 1000);

        const at10 = shouldForceRecalculate ? calculatedAt10 : getSavedOrCalculatedValue(data, "at10", calculatedAt10);
        const at9 = shouldForceRecalculate ? calculatedAt9 : getSavedOrCalculatedValue(data, "at9", calculatedAt9);
        const at8 = shouldForceRecalculate ? calculatedAt8 : getSavedOrCalculatedValue(data, "at8", calculatedAt8);
        const at7 = shouldForceRecalculate ? calculatedAt7 : getSavedOrCalculatedValue(data, "at7", calculatedAt7);
        const ct10 = shouldForceRecalculate ? calculatedCt10 : getSavedOrCalculatedValue(data, "ct10", calculatedCt10);
        const ct9 = shouldForceRecalculate ? calculatedCt9 : getSavedOrCalculatedValue(data, "ct9", calculatedCt9);
        const ct8 = shouldForceRecalculate ? calculatedCt8 : getSavedOrCalculatedValue(data, "ct8", calculatedCt8);
        const ct7 = shouldForceRecalculate ? calculatedCt7 : getSavedOrCalculatedValue(data, "ct7", calculatedCt7);


        return {
          group,
          damage,
          count,
          troops: isNaN(troops) ? 0 : troops,
          at10, at9, at8, at7,
          ct10, ct9, ct8, ct7,
          marchSize: getMarchSize({ at10, at9, at8, at7, ct10, ct9, ct8, ct7 }),
          total: (troops * count).toFixed(2)
        };
      });

      if (groupedData && Object.keys(groupedData).length > 0) {
        const groupedRows = Object.entries(groupedData).map(([color, data]) => {
          const group = data[0]?.colorName || color;
          const avgObj = data.find(d => typeof d === 'object' && 'avgDamage' in d);
          const avgDamage = parseFloat(avgObj?.avgDamage || 0);
          const isValid = !isNaN(avgDamage) && avgDamage > 0;
          return {
            group,
            damage: isValid ? avgDamage : 0,
            isUpdated: isValid
          };
        });

        groupedRows.forEach((newRow) => {
          const idx = formattedRows.findIndex(r => r.group === newRow.group);
          if (idx !== -1) {
            formattedRows[idx] = {
              ...formattedRows[idx],
              damage: newRow.damage,
              ...(newRow.isUpdated ? {} : getZeroTroopValues()),
            };
          } else if (idx === -1) {
            formattedRows.push({
              group: newRow.group,
              damage: newRow.damage,
              count: newRow.isUpdated ? 1 : 0,
              ...getZeroTroopValues(),
            });
          }
        });

        previousGroupedData.current = groupedData;
      }

      formattedRows.sort((a, b) => colorOrder.indexOf(b.group) - colorOrder.indexOf(a.group));
      setRows(formattedRows);
      setIsEdited(false);
      if ((shouldForceRecalculate || groupedData) && isAdmin) {
        await setDoc(doc(db, "formation", `${label}`), buildFormationPayload(formattedRows));
      }
      previousRecalculateToken.current = recalculateToken;
    } catch (err) {
      console.error("Error fetching formation:", err);
    }
  }, [groupedData, isAdmin, label, recalculateToken, settingDocName]);

  useEffect(() => {
    loadFormationData();
  }, [loadFormationData]);

  const handleReload = () => {
    loadFormationData();
  };

  const handleChange = (idx, value) => {
    if (!isAdmin) {
      showNoPermission();
      return;
    }
    const updated = [...rows];
    const count = parseInt(value);
    if (isNaN(count) || count < 0) return;

    updated[idx].count = count;
    const totalDamage = updated.reduce((sum, row) => (!isNaN(row.damage) && row.damage > 0)
      ? sum + row.damage * row.count : sum, 0);

    updated.forEach(row => {
      const share = totalDamage > 0 && row.damage > 0 ? (row.damage) / totalDamage : 0;
      const troops = parseFloat((totalTroopValue * share).toFixed(2));
      row.troops = isNaN(troops) ? 0 : troops;
      row.at10 = MathRound(troops * ratios.at10 / 1000);
      row.at9 = MathRound(troops * ratios.at9 / 1000);
      row.at8 = MathRound(troops * ratios.at8 / 1000);
      row.at7 = MathRound(troops * ratios.at7 / 1000);
      row.ct10 = MathRound(troops * ratios.ct10 / 1000);
      row.ct9 = MathRound(troops * ratios.ct9 / 1000);
      row.ct8 = MathRound(troops * ratios.ct8 / 1000);
      row.ct7 = MathRound(troops * ratios.ct7 / 1000);
      row.marchSize = getMarchSize(row);
      row.total = (row.troops * row.count).toFixed(2);
    });

    setRows(updated);
    setIsEdited(true);
  };

  const handleTroopValueChange = (idx, field, value) => {
    if (!isAdmin) {
      showNoPermission();
      return;
    }

    const numericValue = parseFloat(value);
    if (value !== "" && (Number.isNaN(numericValue) || numericValue < 0)) return;

    const updated = rows.map((row, rowIndex) => {
      if (rowIndex !== idx) return row;

      const next = {
        ...row,
        [field]: value === "" ? "" : numericValue
      };
      next.marchSize = getMarchSize(next);
      return next;
    });

    setRows(updated);
    setIsEdited(true);
  };

  useEffect(() => {
    const uploadToFirestore = async () => {
      if (!isAdmin || !isEdited) return;
      try {
        await setDoc(doc(db, "formation", `${label}`), buildFormationPayload(rows));
        if (process.env.NODE_ENV === "development") {
          console.log("Formation data uploaded successfully.");
        }
        setIsEdited(false);
      } catch (error) {
        console.error("Error uploading formation data:", error);
      }
    };
    uploadToFirestore();
  }, [rows, label, isAdmin, isEdited, type]);

  const handleCopy = (row) => {
    const text = `${row.group}- Archers-${row.at10}k-${row.at9}k-${row.at8}k-${row.at7}k.. Cavalry-${row.ct10}k-${row.ct9}k-${row.ct8}k-${row.ct7}k`;
    navigator.clipboard.writeText(text);
  };
  const totalDamage = rows.reduce((sum, row) => sum + row.damage * row.count, 0).toFixed(2);
  const renderTroopInput = (row, idx, field) => (
    <TextField
      type="number"
      value={row[field]}
      onChange={(e) => handleTroopValueChange(idx, field, e.target.value)}
      size="small"
      inputProps={{ min: 0, step: 0.5 }}
      sx={{
        width: { xs: 54, sm: 58 },
        '& .MuiInputBase-input': {
          px: 0.5,
          py: 0.75,
          textAlign: 'center',
          fontSize: '0.78rem',
          fontVariantNumeric: 'tabular-nums',
        },
      }}
    />
  );

  return (
    <Box sx={{ mt: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.25, md: 2 },
          mb: 2,
          borderRadius: 3,
          backgroundColor: "#ffffff",
          border: "1px solid rgba(15,23,42,0.08)",
        }}
      >
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, gap: 1.5, flexDirection: { xs: "column", sm: "row" } }}>
          <Typography variant="h6">
            Total Damage: {totalDamage}
          </Typography>
          <Button variant="outlined" color="secondary" size="small" onClick={handleReload}>
            Reload Data
          </Button>
        </Box>

        <TableContainer sx={{ maxHeight: { xs: "70dvh", md: "72dvh" }, borderRadius: 2, border: "1px solid rgba(15,23,42,0.08)" }}>
          <Table size="small" sx={{
            minWidth: 980,
            borderCollapse: "separate",
            borderSpacing: 0,
            '& td, & th': {
              border: '1px solid #ddd',  // ⬅️ column + row borders
            },
          }}>
            <TableHead>
              <TableRow>
                <TableCell rowSpan={2}><b>Group</b></TableCell>
                <TableCell rowSpan={2}><b>Avg Damage</b></TableCell>
                <TableCell rowSpan={2}><b>Count</b></TableCell>
                <TableCell rowSpan={2}><b>Troops</b></TableCell>

                <TableCell colSpan={4} align="center"><b>Archers</b></TableCell>
                <TableCell colSpan={4} align="center"><b>Cavalry</b></TableCell>

                <TableCell rowSpan={2}><b>March Size</b></TableCell>
                <TableCell rowSpan={2}><b>Total</b></TableCell>
                <TableCell rowSpan={2}></TableCell>
              </TableRow>
              <TableRow>
                <TableCell><b>T10</b></TableCell>
                <TableCell><b>T9</b></TableCell>
                <TableCell><b>T8</b></TableCell>
                <TableCell><b>T7</b></TableCell>

                <TableCell><b>T10</b></TableCell>
                <TableCell><b>T9</b></TableCell>
                <TableCell><b>T8</b></TableCell>
                <TableCell><b>T7</b></TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>{row.group}</TableCell>
                  <TableCell>{row.damage}</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={row.count}
                      onChange={(e) => handleChange(idx, e.target.value)}
                      size="small"
                      sx={{
                        width: 60,
                        '& .MuiInputBase-input': {
                          px: 0.5,
                          py: 0.75,
                          textAlign: 'center',
                          fontVariantNumeric: 'tabular-nums',
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>{row.troops}</TableCell>
                  <TableCell>{renderTroopInput(row, idx, "at10")}</TableCell>
                  <TableCell>{renderTroopInput(row, idx, "at9")}</TableCell>
                  <TableCell>{renderTroopInput(row, idx, "at8")}</TableCell>
                  <TableCell>{renderTroopInput(row, idx, "at7")}</TableCell>
                  <TableCell>{renderTroopInput(row, idx, "ct10")}</TableCell>
                  <TableCell>{renderTroopInput(row, idx, "ct9")}</TableCell>
                  <TableCell>{renderTroopInput(row, idx, "ct8")}</TableCell>
                  <TableCell>{renderTroopInput(row, idx, "ct7")}</TableCell>

                  <TableCell>{row.marchSize}</TableCell>
                  <TableCell>{row.total}</TableCell>
                  <TableCell>
                    <Tooltip title="Copy values">
                      <IconButton size="small" onClick={() => handleCopy(row)}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );

}
