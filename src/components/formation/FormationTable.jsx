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
    const [ratios, setRatios] = useState({ t10: 0, t9: 0, t8: 0, t7: 0, t6: 0 });
    const [rows, setRows] = useState([]);
    const [isEdited, setIsEdited] = useState(false);
    const previousGroupedData = useRef(null);
    const { showNoPermission } = usePermissionSnackbar();

    const MathRound = (num) => Math.round(num * 2) / 2;

    const settingDocName = type === "archer"
        ? (label.toLowerCase().includes("throne") ? "throne_formation" : "tower_formation")
        : (label.toLowerCase().includes("throne") ? "cavalry_throne_formation" : "cavalry_tower_formation");

    const loadFormationData = async () => {
        try {
           
            const [settingSnap, formationSnap, thresholdsSnap] = await Promise.all([
                getDoc(doc(db, "settings", settingDocName)),
                getDoc(doc(db, "formation", `${type}_${label}`)),
                getDoc(doc(db, "settings", "thresholds"))
            ]);

            const settingData = settingSnap.exists() ? settingSnap.data() : {};
            const formationData = formationSnap.exists() ? formationSnap.data() : {};
            const thresholdData = thresholdsSnap.exists() ? thresholdsSnap.data().thresholds || [] : [];
            const colorOrder = thresholdData.map(t => t.name);

            const totalTroops = type === "archer"
                ? parseFloat(settingData.archers || 0)
                : parseFloat(settingData.cavalry || 0);

            setTotalTroopValue(totalTroops);
            setRatios({
                t10: settingData.t10 / 100,
                t9: settingData.t9 / 100,
                t8: settingData.t8 / 100,
                t7: settingData.t7 / 100,
                t6: settingData.t6 / 100
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

                const t10 = MathRound((troops * (settingData.t10 || 0) / 100) / 1000);
                const t9 = MathRound((troops * (settingData.t9 || 0) / 100) / 1000);
                const t8 = MathRound((troops * (settingData.t8 || 0) / 100) / 1000);
                const t7 = MathRound((troops * (settingData.t7 || 0) / 100) / 1000);
                const t6 = MathRound((troops * (settingData.t6 || 0) / 100) / 1000);

                return {
                    group,
                    damage,
                    count,
                    troops: isNaN(troops) ? 0 : troops,
                    t10,
                    t9,
                    t8,
                    t7,
                    t6,
                    marchSize: t10 + t9 + t8 + t7 + t6,  // ✅ Fixed march size
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
                            t10: 0,
                            t9: 0,
                            t8: 0,
                            t7: 0,
                            t6: 0,
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
    }, []);

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
            row.t10 = MathRound(troops * ratios.t10 / 1000);
            row.t9 = MathRound(troops * ratios.t9 / 1000);
            row.t8 = MathRound(troops * ratios.t8 / 1000);
            row.t7 = MathRound(troops * ratios.t7 / 1000);
            row.t6 = MathRound(troops * ratios.t6 / 1000);
            row.marchSize = row.t10 + row.t9 + row.t8 + row.t7 + row.t6;
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
                        t10: row.t10,
                        t9: row.t9,
                        t8: row.t8,
                        t7: row.t7,
                        t6: row.t6,
                        marchSize: row.marchSize,
                        total: row.total
                    };
                });
                await setDoc(doc(db, "formation", `${type}_${label}`), payload);
                console.log("Formation data uploaded successfully.");
                setIsEdited(false);
            } catch (error) {
                console.error("Error uploading formation data:", error);
            }
        };
        uploadToFirestore();
    }, [rows, label, isAdmin, isEdited]);

    const handleCopy = (row) => {
        const text = `${row.group} - ${row.t10}k - ${row.t9}k - ${row.t8}k - ${row.t7}k - ${row.t6}k`;
        navigator.clipboard.writeText(text);
    };

    const totalDamage = rows.reduce((sum, row) => sum + row.damage * row.count, 0).toFixed(2);

    return (
        <Box sx={{ mt: 4 }}>
            <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="h6">Total Damage: {totalDamage}</Typography>
                <Button variant="outlined" size="small" onClick={handleReload}>
                    Reload Data
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            {["Group", "Avg Damage", "Count", "Troops", "T10", "T9", "T8", "T7", "T6", "March Size", "Total", ""].map((head, i) => (
                                <TableCell key={i}><b>{head}</b></TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, idx) => (
                            <TableRow key={idx}>
                                <TableCell>{row.group}</TableCell>
                                <TableCell>{row.damage}</TableCell>
                                <TableCell>
                                    <TextField
                                        type="number"
                                        value={row.count}
                                        onChange={(e) => handleChange(idx, e.target.value)}
                                        size="small"
                                        sx={{ width: "80px" }}
                                    />
                                </TableCell>
                                <TableCell>{row.troops}</TableCell>
                                <TableCell>{row.t10}</TableCell>
                                <TableCell>{row.t9}</TableCell>
                                <TableCell>{row.t8}</TableCell>
                                <TableCell>{row.t7}</TableCell>
                                <TableCell>{row.t6}</TableCell>
                                <TableCell>{row.marchSize}</TableCell>
                                <TableCell>{row.total}</TableCell>
                                <TableCell>
                                    <Tooltip title="Copy names">
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
        </Box>
    );
}
