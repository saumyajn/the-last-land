import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";

import { db } from '../utils/firebase';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, IconButton, TextField, Stack, Input, Grid, Select, MenuItem, useMediaQuery, Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useTheme } from "@mui/material/styles";
import { calcs, getNumber } from "../utils/calcs";
import { usePermissionSnackbar } from "./Permissions";

import { getColorByThreshold } from "../utils/colorUtils";
import { buildCopyableTable, removePercentage } from "../utils/helpers";

export default function DataTable({ tableData = {}, desiredKeys = [], onDelete, onUpdate, isAdmin }) {

    const [localData, setLocalData] = useState(tableData);
    const [thresholds, setThresholds] = useState([]);
    const [renamePrompt, setRenamePrompt] = useState(null); // { oldName, newName }
    const theme = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [archerOptions, setArcherOptions] = useState([]);
    const [cavalryOptions, setCavalryOptions] = useState([]);
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const { showNoPermission } = usePermissionSnackbar();
    const [copySnackbarOpen, setCopySnackbarOpen] = useState(false);


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
        if (!isAdmin) {
            showNoPermission();
            return;
        }
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
    const handleThresholdChange = async (index, field, value) => {
        if (!isAdmin) {
            showNoPermission();
            return;
        }
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
        <Suspense fallback={<div>LOADING...</div>}>
            <Box component={Paper} elevation={3} sx={{ p: 2, mb: 4, overflowX: "auto" }}>
                <Typography variant="h5" gutterBottom color="primary">
                    Threshold Settings
                </Typography>

                <Grid container spacing={2} justifyContent="center" sx={{ mb: 3 }}>
                    {thresholds.map((thresh, idx) => (
                        <Grid size={{ xs: 6, sm: 4, md: 2 }} key={idx}>
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
            </Box>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
                    <Button variant="outlined" size="small" onClick={handleCopyTable}>
                        Copy Table
                    </Button>
                </Box>
            <Box component={Paper} elevation={3} sx={{ p: 2, mb: 4, overflowX: "auto" }}>
                <Typography variant="h5" gutterBottom color="primary">
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
                                const archerColor = getColorByThreshold(archerVal, thresholds);
                                const cavalryColor = getColorByThreshold(cavalryVal, thresholds);

                                return (
                                    <TableRow key={name} >
                                        <TableCell
                                            align="left"
                                            style={{
                                                position: 'sticky',
                                                left: 0,
                                                background: 'white',
                                                zIndex: 800,
                                            }}
                                        >
                                            <TextField
                                                value={localData[name]?.tempName ?? name}
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
                                                sx={{ width: '120px' }}
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

            </Box>
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
