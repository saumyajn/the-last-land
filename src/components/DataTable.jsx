import React, { useState, useEffect, useMemo } from "react";
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    TextField,
    useMediaQuery,
    Grid,
    Stack,
    Input
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useTheme } from "@mui/material/styles";
import { calcs } from "../utils/calcs";

export default function DataTable({ tableData = {}, desiredKeys = [], onDelete, onUpdate }) {

    const [localData, setLocalData] = useState(tableData);
    const names = useMemo(() => Object.keys(localData), [localData]);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const externalThresholds = [
        { limit: 1000, color: "#e8f5e9" },
        { limit: 1200, color: "#c8e6c9" },
        { limit: 1400, color: "#fff9c4" },
        { limit: 1600, color: "#ffe082" },
        { limit: 1800, color: "#ffcc80" },
        { limit: 2000, color: "#ef9a9a" }
    ];
    const [thresholds, setThresholds] = useState(externalThresholds);

    const getNumber = (val) => parseFloat(val?.toString().replace(/[^\d.]/g, "")) || 0;

    const calculateAll = (player) => {
        const archer =  getNumber(calcs(player, "archer", player["Archer Atlantis"]));
        const cavalry = getNumber(calcs(player, "cavalry", player["Cavalry Atlantis"]));
        return {
            "Final Archer Damage": archer,
            "Final Cavalry Damage": cavalry,
        };
    };

    useEffect(() => {
        const updated = {};
        Object.entries(tableData).forEach(([name, data]) => {
            const { "Final Archer Damage": archerDmg, "Final Cavalry Damage": cavDmg } = calculateAll(data);
            updated[name] = {
                ...data,
                "Final Archer Damage": archerDmg,
                "Final Cavalry Damage": cavDmg,
            };
        });
        setLocalData(updated);
    }, [tableData]);

    if (!names.length) return null;

    const handleEdit = (name, field, value) => {
        const updatedPlayer = {
            ...localData[name],
            [field]: value
        };
        const { "Final Archer Damage": archerDmg, "Final Cavalry Damage": cavDmg } = calculateAll(updatedPlayer);

        updatedPlayer["Final Archer Damage"] = archerDmg;
        updatedPlayer["Final Cavalry Damage"] = cavDmg;
        const updatedData = {
            ...localData,
            [name]: updatedPlayer,
        };

        setLocalData(updatedData);
        onUpdate(name, {
            [field]: value,
            "Final Archer Damage": archerDmg,
            "Final Cavalry Damage": cavDmg,
        });
    };

    const getColorByThreshold = (value) => {
        const sorted = [...thresholds].sort((a, b) => b.limit - a.limit);
        for (const threshold of sorted) {
            if (value >= threshold.limit) return threshold.color;
        }
        return "inherit";
    };

    const handleThresholdChange = (index, field, value) => {
        const newThresholds = [...thresholds];
        newThresholds[index] = {
            ...newThresholds[index],
            [field]: field === "limit" ? parseFloat(value) || 0 : value,
        };
        setThresholds(newThresholds);
    };

    return (
        <Box component={Paper} elevation={3} sx={{ p: 2, mb: 4, overflowX: "auto" }}>
            <Typography variant="h6" gutterBottom textAlign="center">
                Threshold Settings
            </Typography>

            <Grid container spacing={2} justifyContent="center" sx={{ mb: 3 }}>
                {thresholds.map((thresh, idx) => (
                    <Grid item xs={6} sm={4} md={2} key={idx}>
                        <Stack spacing={1} alignItems="center">
                            <TextField
                                label={`Limit ${idx + 1}`}
                                value={thresh.limit}
                                onChange={(e) => handleThresholdChange(idx, "limit", e.target.value)}
                                size="small"
                                type="number"
                                fullWidth
                            />
                            <Input
                                type="color"
                                value={thresh.color}
                                onChange={(e) => handleThresholdChange(idx, "color", e.target.value)}
                                sx={{ width: "100%", height: 40, borderRadius: 1, border: '1px solid #ccc' }}
                            />
                        </Stack>
                    </Grid>
                ))}
            </Grid>
            <Typography variant="h6" gutterBottom>
                Combined Stats Table
            </Typography>

            <TableContainer sx={{ minWidth: isMobile ? 700 : "100%" }}>
                <Table size="small" sx={{ minWidth: "100%" }}>
                    <TableHead>
                        <TableRow>
                            <TableCell><b>Name</b></TableCell>
                            {desiredKeys.map((key) => (
                                <TableCell key={key}><b>{key}</b></TableCell>
                            ))}
                            <TableCell><b>Multiplier</b></TableCell>
                            <TableCell><b>Archer Atlantis</b></TableCell>
                            <TableCell><b>Cavalry Atlantis</b></TableCell>
                            <TableCell><b>Final Archer Damage</b></TableCell>
                            <TableCell><b>Final Cavalry Damage</b></TableCell>
                            <TableCell><b>Actions</b></TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {names.map((name) => {
                            const rowData = localData[name];
                            const archerVal = getNumber(rowData["Final Archer Damage"]);
                            const cavalryVal = getNumber(rowData["Final Cavalry Damage"]);
                            const archerColor = getColorByThreshold(archerVal);
                            const cavalryColor = getColorByThreshold(cavalryVal);

                            return (
                                <TableRow key={name}  >
                                    <TableCell>{name}</TableCell>
                                    {desiredKeys.map((key) => (
                                        <TableCell key={key} >
                                            {rowData[key] || "NA"}
                                        </TableCell>
                                    ))}
                                    <TableCell>
                                        <TextField size="small" value="0" />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            value={rowData["Archer Atlantis"] || ""}
                                            onChange={(e) => handleEdit(name, "Archer Atlantis", e.target.value)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            value={rowData["Cavalry Atlantis"] || ""}
                                            onChange={(e) => handleEdit(name, "Cavalry Atlantis", e.target.value)}
                                            size="small"
                                        />
                                    </TableCell>

                                    <TableCell sx={{
                                        backgroundColor: archerColor
                                    }} >
                                        {archerVal}
                                    </TableCell>

                                    <TableCell sx={{ backgroundColor: cavalryColor }}>
                                        {cavalryVal}
                                    </TableCell>
                                    <TableCell>
                                        <IconButton color="error" onClick={() => onDelete(name)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                        }
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
