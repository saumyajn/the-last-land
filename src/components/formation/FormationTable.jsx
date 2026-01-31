import React, { useEffect, useState, useRef } from "react";
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

export default function FormationTable({ label, groupedData = null, isAdmin, type }) {
  const [totalTroopValue, setTotalTroopValue] = useState(0);
  const [ratios, setRatios] = useState({ at10: 0, at9: 0, at8: 0, at7: 0, ct10: 0, ct9: 0, ct8: 0, ct7: 0 });
  const [rows, setRows] = useState([]);
  const [isEdited, setIsEdited] = useState(false);
  const previousGroupedData = useRef(null);
  const { showNoPermission } = usePermissionSnackbar();

  const MathRound = (num) => Math.round(num * 2) / 2;

  const settingDocName = label.toLowerCase().includes("throne") ? "throne_formation" : "tower_formation"


  const loadFormationData = async () => {
    try {

      const [settingSnap, formationSnap, thresholdsSnap] = await Promise.all([
        getDoc(doc(db, "settings", settingDocName)),
        getDoc(doc(db, "formation", `${label}`)),
        getDoc(doc(db, "settings", "thresholds"))
      ]);

      const settingData = settingSnap.exists() ? settingSnap.data() : {};
      const formationData = formationSnap.exists() ? formationSnap.data() : {};
      const thresholdData = thresholdsSnap.exists() ? thresholdsSnap.data().thresholds || [] : [];
      const colorOrder = thresholdData.map(t => t.name);

      const totalTroops = parseFloat(settingData.archers) + parseFloat(settingData.cavalry) || 0;

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

        const at10 = MathRound((troops * (settingData.at10 || 0) / 100) / 1000);
        const at9 = MathRound((troops * (settingData.at9 || 0) / 100) / 1000);
        const at8 = MathRound((troops * (settingData.at8 || 0) / 100) / 1000);
        const at7 = MathRound((troops * (settingData.at7 || 0) / 100) / 1000);

        const ct10 = MathRound((troops * (settingData.ct10 || 0) / 100) / 1000);
        const ct9 = MathRound((troops * (settingData.ct9 || 0) / 100) / 1000);
        const ct8 = MathRound((troops * (settingData.ct8 || 0) / 100) / 1000);
        const ct7 = MathRound((troops * (settingData.ct7 || 0) / 100) / 1000);


        return {
          group,
          damage,
          count,
          troops: isNaN(troops) ? 0 : troops,
          at10, at9, at8, at7,
          ct10, ct9, ct8, ct7,
          marchSize: at10 + at9 + at8 + at7 + ct10 + ct9 + ct8 + ct7,  // ✅ Fixed march size
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
          if (idx !== -1 && newRow.isUpdated) {
            formattedRows[idx].damage = newRow.damage;
          } else if (idx === -1) {
            formattedRows.push({
              group: newRow.group,
              damage: newRow.damage,
              count: newRow.isUpdated ? 1 : 0,
              troops: 0,
              at10: 0, at9: 0, at8: 0, at7: 0,
              ct10: 0, ct9: 0, ct8: 0, ct7: 0,
              marchSize: 0,
              total: 0
            });
          }
        });

        previousGroupedData.current = groupedData;
      }

      formattedRows.sort((a, b) => colorOrder.indexOf(b.group) - colorOrder.indexOf(a.group));
      setRows(formattedRows);
      setIsEdited(false);
    } catch (err) {
      console.error("Error fetching formation:", err);
    }
  };

  useEffect(() => {
    loadFormationData();
  });

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
      row.marchSize = row.at10 + row.at9 + row.at8 + row.at7 + row.ct10 + row.ct9 + row.ct8 + row.ct7;
      row.total = (row.troops * row.count).toFixed(2);
    });

    setRows(updated);
    setIsEdited(true);
  };

  useEffect(() => {
    const uploadToFirestore = async () => {
      if (!isAdmin || !isEdited) return;
      try {
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
        await setDoc(doc(db, "formation", `${label}`), payload);
        console.log("Formation data uploaded successfully.");
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

  return (
    <Box sx={{ mt: 3 }}>
      <Paper
        elevation={3}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 3,
          backgroundColor: "#fdfdfd",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" fontWeight="bold">
            Total Damage: {totalDamage}
          </Typography>
          <Button variant="outlined" color="secondary" size="small" onClick={handleReload}>
            Reload Data
          </Button>
        </Box>

        <TableContainer>
          <Table size="small" sx={{
            borderCollapse: "collapse",
            '& td, & th': {
              border: '1px solid #ddd',  // ⬅️ column + row borders
            },
          }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#e3f2fd" }}>
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
              <TableRow sx={{ backgroundColor: "#e3f2fd" }}>
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
                      sx={{ width: 70, mx: 1 }}
                    />
                  </TableCell>
                  <TableCell>{row.troops}</TableCell>
                  <TableCell>{row.at10}</TableCell>
                  <TableCell>{row.at9}</TableCell>
                  <TableCell>{row.at8}</TableCell>
                  <TableCell>{row.at7}</TableCell>
                  <TableCell>{row.ct10}</TableCell>
                  <TableCell>{row.ct9}</TableCell>
                  <TableCell>{row.ct8}</TableCell>
                  <TableCell>{row.ct7}</TableCell>

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
