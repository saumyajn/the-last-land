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
    useMediaQuery
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useTheme } from "@mui/material/styles";
import { calcs } from "../utils/calcs";
export default function DataTable({ tableData = {}, desiredKeys = [], onDelete, onUpdate }) {

    const [localData, setLocalData] = useState(tableData);
    const names = useMemo(() => Object.keys(localData), [localData]);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const thresholds = useMemo(
        () => [
            { limit: 1000, color: "#e8f5e9" },
            { limit: 1200, color: "#c8e6c9" },
            { limit: 1400, color: "#fff9c4" },
            { limit: 1600, color: "#ffe082" },
            { limit: 1800, color: "#ffcc80" },
            { limit: 2000, color: "#ef9a9a" }
        ],
        []
    );
    const getNumber = (val) => parseFloat(val?.toString().replace(/[^\d.]/g, "")) || 0;

    const calculateAll = (player) => {
        const archer = calcs(player, player["Archer Atlantis"]);
        const cavalry = calcs(player, player["Cavalry Atlantis"]);
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
        for (let i = 0; i < thresholds.length; i++) {
            if (value > thresholds[i].limit) {
                return thresholds[i].color;
            }
        }
        return "inherit";
    };
    return (
        <Box component={Paper} elevation={3} sx={{ p: 2, mb: 4, overflowX: "auto" }}>
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
                            const archerVal = getNumber(localData[name]["Archer Atlantis"]);
                            const cavalryVal = getNumber(localData[name]["Cavalry Atlantis"]);

                            return (
                                <TableRow key={name}  >
                                    <TableCell>{name}</TableCell>
                                    {desiredKeys.map((key) => (
                                        <TableCell key={key} >
                                            {localData[name][key] || "NA"}
                                        </TableCell>
                                    ))}
                                    <TableCell>
                                        <TextField size="small" value="0" />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            value={localData[name]["Archer Atlantis"] || ""}
                                            onChange={(e) => handleEdit(name, "Archer Atlantis", e.target.value)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            value={localData[name]["Cavalry Atlantis"] || ""}
                                            onChange={(e) => handleEdit(name, "Cavalry Atlantis", e.target.value)}
                                            size="small"
                                        />
                                    </TableCell>

                                    <TableCell sx={{
                                        backgroundColor: getColorByThreshold(archerVal)
                                    }} >
                                        {localData[name]["Final Archer Damage"]}
                                    </TableCell>

                                    <TableCell sx={{ backgroundColor: getColorByThreshold(cavalryVal) }}>
                                        {localData[name]["Final Cavalry Damage"]}
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
