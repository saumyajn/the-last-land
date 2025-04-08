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
    IconButton
} from "@mui/material";
import { db } from "../utils/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

export default function FormationTable({ label, groupedData = null }) {
    const [archerValue, setArcherValue] = useState(0);
    const [ratios, setRatios] = useState({ t10: 0, t9: 0, t8: 0, t7: 0, t6: 0 });
    const [rows, setRows] = useState([]);
    const previousGroupedData = useRef(null);

    useEffect(() => {
        console.log(groupedData)
        const fetchData = async () => {
            try {
                const [settingSnap, formationSnap, thresholdsSnap] = await Promise.all([
                    getDoc(doc(db, "settings", label)),
                    getDoc(doc(db, "formation", `archer_${label}`)),
                    getDoc(doc(db, "settings", "thresholds"))
                ]);

                const settingData = settingSnap.exists() ? settingSnap.data() : {};
                const thresholdData = thresholdsSnap.exists() ? thresholdsSnap.data().thresholds || [] : [];
                const colorOrder = thresholdData.map(t => t.name);

                const archerVal = parseFloat(settingData.archers);
                setRatios({
                    t10: settingData.t10 / 100,
                    t9: settingData.t9 / 100,
                    t8: settingData.t8 / 100,
                    t7: settingData.t7 / 100,
                    t6: settingData.t6 / 100
                });
                setArcherValue(archerVal);

                const formationData = formationSnap.exists() ? formationSnap.data() : {};
                let formattedRows = Object.entries(formationData).map(([group, data]) => ({
                    group,
                    damage: data.avgDamage || 0,
                    count: data.count || 0,
                    troops: data.troops || 0,
                    t10: data.t10 || 0,
                    t9: data.t9 || 0,
                    t8: data.t8 || 0,
                    t7: data.t7 || 0,
                    t6: data.t6 || 0,
                    marchSize: data.marchSize || 0,
                    total: data.total || 0
                }));

                if (groupedData) {
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
            } catch (err) {
                console.error("Error fetching data:", err);
            }
        };

        fetchData();
    }, [groupedData, label]);

    const MathRound = (num) => Math.round(num * 2) / 2;

    const handleChange = (idx, value) => {
        const updated = [...rows];
        const count = parseInt(value);
        if (isNaN(count) || count < 0) return;

        updated[idx].count = count;
        const totalDamage = updated.reduce((sum, row) => (!isNaN(row.damage) && row.damage > 0) ? sum + row.damage * row.count : sum, 0);

        updated.forEach(row => {
            const share = totalDamage > 0 && row.damage > 0 ? (row.damage * row.count) / totalDamage : 0;
            const troops = parseFloat((archerValue * share).toFixed(2));
            row.troops = isNaN(troops) ? 0 : troops;
            row.t10 = MathRound((troops * ratios.t10) / 1000);
            row.t9 = MathRound((troops * ratios.t9) / 1000);
            row.t8 = MathRound((troops * ratios.t8) / 1000);
            row.t7 = MathRound((troops * ratios.t7) / 1000);
            row.t6 = MathRound((troops * ratios.t6) / 1000);
            row.marchSize = row.t10 + row.t9 + row.t8 + row.t7 + row.t6;
            row.total = (row.troops * row.count).toFixed(2);
        });

        setRows(updated);
    };

    useEffect(() => {
        const uploadToFirestore = async () => {
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
                await setDoc(doc(db, "formation", `archer_${label}`), payload);
                console.log("Formation data uploaded successfully.");
            } catch (error) {
                console.error("Error uploading formation data:", error);
            }
        };

        if (rows.length > 0) uploadToFirestore();
    }, [rows, label]);

    const handleCopy = (row) => {
        const text = `${row.group} - ${row.t10}k - ${row.t9}k - ${row.t8}k - ${row.t7}k - ${row.t6}k`;
        navigator.clipboard.writeText(text);
    };

    const totalDamage = rows.reduce((sum, row) => sum + row.damage * row.count, 0).toFixed(2);

    return (
        <Box sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Total Damage: {totalDamage}</Typography>
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell><b>Group</b></TableCell>
                            <TableCell><b>Avg Archer Damage</b></TableCell>
                            <TableCell><b>Count</b></TableCell>
                            <TableCell><b>Troops</b></TableCell>
                            <TableCell><b>T10</b></TableCell>
                            <TableCell><b>T9</b></TableCell>
                            <TableCell><b>T8</b></TableCell>
                            <TableCell><b>T7</b></TableCell>
                            <TableCell><b>T6</b></TableCell>
                            <TableCell><b>March Size</b></TableCell>
                            <TableCell><b>Total</b></TableCell>
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
                                        fullWidth
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
