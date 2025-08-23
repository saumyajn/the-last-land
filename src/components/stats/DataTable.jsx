import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";

import { db } from '../../utils/firebase';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, IconButton, TextField, Stack, Input, Grid, Select, MenuItem, useMediaQuery, Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import { useTheme } from "@mui/material/styles";
import { calcs, getNumber, buildCopyableTable, removePercentage } from "../../utils/calcs";
import { usePermissionSnackbar } from "../Permissions";

import { getColorByThreshold } from "../../utils/colorUtils";


export default function DataTable({ tableData = {}, desiredKeys = [], onDelete, onUpdate, isAdmin }) {

    const [localData, setLocalData] = useState(tableData);
    const [thresholds, setThresholds] = useState([]);
    const [renamePrompt, setRenamePrompt] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [archerOptions, setArcherOptions] = useState([]);
    const [cavalryOptions, setCavalryOptions] = useState([]);
    const [copySnackbarOpen, setCopySnackbarOpen] = useState(false);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const { showNoPermission } = usePermissionSnackbar();

    const calculateAll = useCallback((player) => {
        const archer = getNumber(calcs(player, "archer", player["Archer Atlantis"]));
        const cavalry = getNumber(calcs(player, "cavalry", player["Cavalry Atlantis"]));
        const multiplier = getNumber(player["Multiplier"]);
        return {
            "Final Archer Damage": (archer * multiplier).toFixed(5),
            "Final Cavalry Damage": (cavalry * multiplier).toFixed(5),
        };
    }, []);

    const handleCopyTable = () => {
        const tsvContent = buildCopyableTable(names, localData, desiredKeys);

        navigator.clipboard.writeText(tsvContent)
            .then(() => {
                setCopySnackbarOpen(true);
            })
            .catch((err) => {
                console.error("Failed to copy:", err);
            });
    };

    const handleEdit = (name, field, value) => {
        if (!isAdmin) return showNoPermission();

        const updatedPlayer = {
            ...localData[name],
            [field]: value,
        };
        const calculated = calculateAll(updatedPlayer);
        const avgDamage = (
            ((parseFloat(calculated["Final Archer Damage"]) || 0) +
                (parseFloat(calculated["Final Cavalry Damage"]) || 0)) / 2
        ).toFixed(2);

        const updatedData = {
            ...localData,
            [name]: {
                ...updatedPlayer,
                ...calculated,
                "Average Damage": avgDamage,
            },
        };

        setLocalData(updatedData);
        onUpdate(name, updatedData[name]);
    };
    const handleThresholdChange = async (index, field, value) => {
        if (!isAdmin) return showNoPermission();

        const newThresholds = [...thresholds];
        newThresholds[index] = {
            ...newThresholds[index],
            [field]: field === "limit" ? parseFloat(value) || 0 : value,
        };
        setThresholds(newThresholds);

        try {
            const thresholdRef = doc(db, "settings", "thresholds");
            await setDoc(thresholdRef, {
                thresholds: newThresholds
            });
        } catch (error) {
            console.error("Error updating thresholds in Firestore:", error);
        }
    };

    useEffect(() => {
        const fetchThresholds = async () => {
            setIsLoading(true);
            try {
                const thresholdRef = doc(db, "settings", "thresholds");
                const snapshot = await getDoc(thresholdRef);
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    if (data.thresholds) {
                        setThresholds(data.thresholds);
                    }
                }
                //add options here
                const optionsRef = doc(db, "settings", "atlantis_damage");
                const optionsSnap = await getDoc(optionsRef);
                if (optionsSnap.exists()) {
                    const data = optionsSnap.data();
                    const optionsArr = Object.entries(data).sort((a, b) => Number(a[1]) - Number(b[1]));

                    setArcherOptions(optionsArr);
                    setCavalryOptions(optionsArr);
                }
            } catch (error) {
                console.error("Failed to load thresholds from Firestore:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchThresholds();
    }, []);

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
    }, [tableData, calculateAll, thresholds]);

    const names = useMemo(() => Object.keys(localData), [localData]);
    if (!names.length) return null;



    if (isLoading) {
        return <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
            <CircularProgress size={40} color="inherit" />
        </Box>
    }
    return (
        <Suspense fallback={<Box p={4}>Loading...</Box>}>
            <Paper elevation={3} sx={{ p: 2, mb: 4 }}>
                <Typography variant="h5" gutterBottom color="primary">
                    Threshold Settings
                </Typography>


                <Grid container spacing={2}>
                    {thresholds.map((thresh, idx) => (
                        <Grid size={{ xs: 12, sm: 3, md: 1.5 }} key={idx}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <TextField
                                    label={`Limit ${idx + 1}`}
                                    value={thresh.limit}
                                    onChange={(e) => handleThresholdChange(idx, "limit", e.target.value)}
                                    size="small"
                                    type="number"
                                    fullWidth
                                />


                                <Box
                                    sx={{
                                        width: '30%',
                                        height: 40,
                                        overflow: 'hidden',
                                        display: 'inline-block',
                                    }}
                                >
                                    <input
                                        type="color"
                                        value={thresh.color}
                                        onChange={(e) => handleThresholdChange(idx, 'color', e.target.value)}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            border: 'none',
                                            padding: 0,
                                            cursor: 'pointer',
                                            appearance: 'none',
                                            WebkitAppearance: 'none',
                                            backgroundColor: 'transparent',
                                        }}
                                    />
                                </Box>


                            </Stack>
                        </Grid>
                    ))}
                </Grid>
            </Paper>

            <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2, boxShadow: 4 }}>
                <Typography variant="h5" gutterBottom color="primary">
                    Combined Stats Table
                </Typography>

                <Button variant="outlined" color="secondary" size="small" sx={{ mb: 1 }} onClick={handleCopyTable}>
                    Copy Table
                </Button>

                <TableContainer sx={{ minWidth: isMobile ? 700 : "100%" }}>
                    <Table size="small" sx={{ minWidth: "100%" }}>
                        <TableHead sx={{ backgroundColor: theme.palette.grey[200] }}>
                            <TableRow>
                                <TableCell style={{
                                    position: 'sticky', left: 0,
                                    backgroundColor: theme.palette.grey[50],
                                    zIndex: 800,
                                }}><b>Name</b></TableCell>
                                {desiredKeys.map((key) => (
                                    <TableCell key={key}><b>{key}</b></TableCell>
                                ))}
                                <TableCell><b>Multiplier</b></TableCell>
                                <TableCell><b>Archer Atlantis</b></TableCell>
                                <TableCell><b>Cavalry Atlantis</b></TableCell>
                                <TableCell><b>Final Archer Damage</b></TableCell>
                                <TableCell><b>Final Cavalry Damage</b></TableCell>
                                <TableCell><b>Avg Damage</b></TableCell>
                                <TableCell><b>Actions</b></TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {names.map((name) => {
                                const rowData = localData[name];
                                const archerVal = getNumber(rowData["Final Archer Damage"]);
                                const cavalryVal = getNumber(rowData["Final Cavalry Damage"]);
                                const archerColor = getColorByThreshold(archerVal, thresholds);
                                const cavalryColor = getColorByThreshold(cavalryVal, thresholds);
                                const avgDamage = ((archerVal || 0) + (cavalryVal || 0)) / 2;
                                const avgColor = getColorByThreshold(avgDamage, thresholds);

                                return (
                                    <TableRow key={name} hover>
                                        <TableCell
                                            align="left"
                                            style={{
                                                position: 'sticky',
                                                left: 0,
                                                background: 'white',
                                                zIndex: 800,
                                                backgroundColor: theme.palette.grey[50]
                                            }}
                                        >
                                            <TextField
                                                value={rowData?.tempName ?? name}
                                                onChange={(e) => {
                                                    const newName = e.target.value;
                                                    setLocalData((prev) => ({
                                                        ...prev,
                                                        [name]: {
                                                            ...prev[name],
                                                            tempName: newName,
                                                        },
                                                    }));
                                                }}
                                                onBlur={(e) => {
                                                    const newName = e.target.value.trim();
                                                    if (newName && newName !== name) {
                                                        setRenamePrompt({ oldName: name, newName });
                                                    }
                                                }}
                                                size="small"
                                                sx={{ width: '100px' }}
                                            />
                                        </TableCell>



                                        {desiredKeys.map((key) => (
                                            <TableCell key={key}>
                                                <TextField
                                                    value={removePercentage(rowData[key]) || ""}
                                                    onChange={(e) => handleEdit(name, key, e.target.value)}
                                                    size="small"
                                                    sx={{ width: '100px' }}

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
                                            {archerOptions.length > 0 ? (
                                                (() => {
                                                    const selectedArcher = String(rowData["Archer Atlantis"] || "0");
                                                    const validArcherValues = archerOptions.map(([_, value]) => String(value));
                                                    const safeArcherValue = validArcherValues.includes(selectedArcher)
                                                        ? selectedArcher
                                                        : "0"; // fallback to "0" if value not found

                                                    return (
                                                        <Select
                                                            value={safeArcherValue}
                                                            onChange={(e) => handleEdit(name, "Archer Atlantis", e.target.value)}
                                                            size="small"
                                                            fullWidth
                                                        >
                                                            {archerOptions.map(([label, value]) => (
                                                                <MenuItem key={label} value={String(value)}>
                                                                    {label}
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                    );
                                                })()
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    Loading...
                                                </Typography>
                                            )}


                                        </TableCell>
                                        <TableCell>
                                            {cavalryOptions.length > 0 ? (
                                                (() => {
                                                    const selectedCavalry = String(rowData["Cavalry Atlantis"] || "0");
                                                    const validCavalryValues = cavalryOptions.map(([_, value]) => String(value));
                                                    const safeCavalryValue = validCavalryValues.includes(selectedCavalry)
                                                        ? selectedCavalry
                                                        : "0";

                                                    return (
                                                        <Select
                                                            value={safeCavalryValue}
                                                            onChange={(e) => handleEdit(name, "Cavalry Atlantis", e.target.value)}
                                                            size="small"
                                                            fullWidth
                                                        >
                                                            {cavalryOptions.map(([label, value]) => (
                                                                <MenuItem key={label} value={String(value)}>
                                                                    {label}
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                    );
                                                })()
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    Loading..
                                                </Typography>
                                            )}


                                        </TableCell>

                                        <TableCell sx={{
                                            backgroundColor: archerColor, border: '2px solid #f0f0f0'
                                        }} >
                                            {archerVal}
                                        </TableCell>

                                        <TableCell sx={{ backgroundColor: cavalryColor, border: '2px solid #f0f0f0' }}>
                                            {cavalryVal}
                                        </TableCell>
                                        <TableCell sx={{ backgroundColor: avgColor, border: '2px solid #f0f0f0' }}>
                                            {avgDamage.toFixed(2)}
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
                <Snackbar
                    open={copySnackbarOpen}
                    autoHideDuration={2000}
                    onClose={() => setCopySnackbarOpen(false)}
                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                >
                    <MuiAlert
                        elevation={6}
                        variant="filled"
                        severity="success"
                        onClose={() => setCopySnackbarOpen(false)}
                        sx={{ width: "100%" }}
                    >
                        Table copied! Paste it into Excel.
                    </MuiAlert>
                </Snackbar>

            </Paper>
            {renamePrompt && (
                <Dialog open onClose={() => setRenamePrompt(null)}>
                    <DialogTitle>Confirm Rename</DialogTitle>
                    <DialogContent>
                        Rename <b>{renamePrompt.oldName}</b> to <b>{renamePrompt.newName}</b>?
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setRenamePrompt(null)}>Cancel</Button>
                        <Button
                            variant="contained"
                            onClick={async () => {
                                const { oldName, newName } = renamePrompt;
                                try {
                                    const oldRef = doc(db, "stats", oldName);
                                    const snap = await getDoc(oldRef);

                                    if (!snap.exists()) throw new Error("Original player not found");

                                    const data = snap.data();

                                    await setDoc(doc(db, "stats", newName), data);
                                    await deleteDoc(oldRef);

                                    setLocalData((prev) => {
                                        const updated = { ...prev };
                                        updated[newName] = {
                                            ...updated[oldName],
                                            tempName: undefined,
                                        };
                                        delete updated[oldName];
                                        return updated;
                                    });

                                    onUpdate(newName, {
                                        ...localData[oldName],
                                        tempName: undefined,
                                    });

                                    setRenamePrompt(null);
                                } catch (err) {
                                    console.error("Rename failed:", err);
                                    setRenamePrompt(null);
                                }
                            }}
                        >
                            Confirm
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </Suspense>
    );
}
