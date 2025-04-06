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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useTheme } from "@mui/material/styles";
import { calcs } from "../utils/calcs";
import Thresold, { getColorByThreshold } from "./Thresold";

export default function DataTable({ tableData = {}, desiredKeys = [], onDelete, onUpdate }) {

    const [localData, setLocalData] = useState(tableData);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const getNumber = (val) => parseFloat(val?.toString().replace(/[^\d.]/g, "")) || 0;

    const calculateAll = (player) => {
        const archer = getNumber(calcs(player, "archer", player["Archer Atlantis"]));
        const cavalry = getNumber(calcs(player, "cavalry", player["Cavalry Atlantis"]));
        const multiplier = getNumber(player["Multiplier"])
        return {
            "Final Archer Damage": (archer * multiplier).toFixed(5),
            "Final Cavalry Damage": (cavalry * multiplier).toFixed(5),
        };
    };

    const handleEdit = (name, field, value) => {
        const updatedPlayer = {
            ...localData[name],
            [field]: value,
        };
        const calculated = calculateAll(updatedPlayer);
        const updatedData = {
            ...localData,
            [name]: {
                ...updatedPlayer,
                ...calculated,
            },
        };

        setLocalData(updatedData);
        onUpdate(name, {
            ...updatedPlayer,
            ...calculated,
        });
    };

    useEffect(() => {
        const updated = {};
        Object.entries(tableData).forEach(([name, data]) => {
            const calculated = calculateAll(data);
            updated[name] = {
                ...data,
                ...calculated,
            };
        });
        setLocalData(updated);
    }, [tableData]);

    const names = useMemo(() => Object.keys(localData), [localData]);
    if (!names.length) return null;

    return (
        <Box component={Paper} elevation={3} sx={{ p: 2, mb: 4, overflowX: "auto" }}>
            <Thresold />
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
                                        <TableCell key={key}>
                                            <TextField
                                                value={rowData[key] || ""}
                                                onChange={(e) => handleEdit(name, key, e.target.value)}
                                                size="small"

                                            />
                                        </TableCell>
                                    ))}
                                    <TableCell>
                                        <TextField
                                            value={rowData["Multiplier"] || ""}
                                            onChange={(e) => handleEdit(name, "Multiplier", e.target.value)}
                                            size="small"
                                            fullWidth
                                        />
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
