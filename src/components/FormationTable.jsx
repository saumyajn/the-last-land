import React, { useEffect, useState } from "react";
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
    Typography
} from "@mui/material";
import { db } from "../utils/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export default function FormationTable({ label }) {
    const [archerValue, setArcherValue] = useState(0);
    const [rows, setRows] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [archerSnap, formationSnap] = await Promise.all([
                    getDoc(doc(db, "settings", label)),
                    getDoc(doc(db, "formation", "archer"))
                ]);

                const archerVal = archerSnap.exists() ? parseFloat(archerSnap.data().archers) : 0;
                const formationData = formationSnap.exists() ? formationSnap.data() : {};
                setArcherValue(archerVal);

                const formattedRows = Object.entries(formationData).map(([group, data]) => ({
                    group,
                    damage: data.avgDamage || 0,
                    count: data.count || 0,
                    troops: data.troops || 0
                }));

                setRows(formattedRows);
            } catch (err) {
                console.error("Error fetching data:", err);
            }
        };

        fetchData();
    }, []);

    const handleChange = (idx, value) => {
        const updated = [...rows];
        const count = parseInt(value);
        if (isNaN(count) || count < 0) return;

        updated[idx].count = count;
        const totalDamage = updated.reduce((sum, row) => sum + row.damage * row.count, 0);
        updated.forEach(row => {
            const share = row.damage / totalDamage;
            row.troops = parseFloat((archerValue * share).toFixed(2));
        })



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
                        troops: row.troops
                    };
                });
                await setDoc(doc(db, "formation", "archer"), payload);
                console.log("Formation data uploaded successfully.");
            } catch (error) {
                console.error("Error uploading formation data:", error);
            }
        };
        if (rows.length > 0) uploadToFirestore();
    }, [rows]);

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
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
