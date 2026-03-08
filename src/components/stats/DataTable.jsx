import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, IconButton, TextField, Stack, Grid, Select, useMediaQuery, Dialog, DialogTitle, DialogContent, DialogActions, Button, Skeleton, Tooltip, Divider
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import SettingsIcon from '@mui/icons-material/Settings';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useTheme } from "@mui/material/styles";
import { calcs, getNumber, buildCopyableTable, removePercentage } from "../../utils/calcs";
import { db } from '../../utils/firebase';
import { usePermissionSnackbar } from "../Permissions";
import { getColorByThreshold } from "../../utils/colorUtils";

const columnGroups = [
    { label: "Troop", keys: ["Troop Attack", "Troop Health", "Troop Defense", "Troop Damage", "Troop Damage Received", "Troop Attack Blessing", "Troop Protection Blessing"] },
    { label: "Archer", keys: ["Archer Attack", "Archer Health", "Archer Defense", "Archer Damage", "Archer Damage Received", "Archer Attack Blessing", "Archer Protection Blessing"] },
    { label: "Cavalry", keys: ["Cavalry Attack", "Cavalry Health", "Cavalry Defense", "Cavalry Damage", "Cavalry Damage Received", "Cavalry Attack Blessing", "Cavalry Protection Blessing"] },
    { label: "Siege", keys: ["Siege Attack", "Siege Health", "Siege Defense", "Siege Damage", "Siege Damage Received", "Siege Attack Blessing", "Siege Protection Blessing"] }
];

const extraColumns = [
    { label: 'Lethal Hit Rate', key: 'Lethal Hit Rate' },
    { label: "Archer Atlantis", key: "Archer Atlantis" },
    { label: "Cavalry Atlantis", key: "Cavalry Atlantis" },
    { label: "Siege Atlantis", key: "Siege Atlantis" },
    { label: "Final Archer", key: "Final Archer Damage" },
    { label: "Final Cavalry", key: "Final Cavalry Damage" },
    { label: "Final Siege", key: "Final Siege Damage" },
    { label: "Avg Damage", key: "Average Damage" },
    { label: "Actions", key: "Actions" }
];
const weightKeysOrder = [
        "attack", 
        "health", 
        "defense", 
        "damage", 
        "damageReceived", 
        "attackBlessing", 
        "protectBlessing", 
        "archerRatio", 
        "cavalryRatio"
    ];

const CleanInput = ({ value, onChange, width = '75px' }) => (
    <TextField
        value={value}
        onChange={onChange}
        variant="standard"
        size="small"
        InputProps={{
            disableUnderline: true,
            sx: {
                fontSize: '0.875rem',
                textAlign: 'center',
                '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 1 },
                '&.Mui-focused': { backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 1 }
            }
        }}
        sx={{ width, input: { textAlign: 'center', padding: '4px' } }}
    />
);

export default function DataTable({ tableData = {}, desiredKeys = [], onDelete, onUpdate, isAdmin, statWeights = {}, setStatWeights }) {

    const [localData, setLocalData] = useState({});
    const [thresholds, setThresholds] = useState([]);

    const [renamePrompt, setRenamePrompt] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [archerOptions, setArcherOptions] = useState([]);
    const [cavalryOptions, setCavalryOptions] = useState([]);
    const [siegeOptions, setSiegeOptions] = useState([]);
    const [copySnackbarOpen, setCopySnackbarOpen] = useState(false);

    const [settingsOpen, setSettingsOpen] = useState(false);

    const [expandedGroups, setExpandedGroups] = useState(() =>
        Object.fromEntries(columnGroups.map(g => [g.label, true]))
    );

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const { showNoPermission } = usePermissionSnackbar();

    const names = useMemo(() => Object.keys(localData), [localData]);

    // 🔥 Centralized Calculation: Now computes Average Damage directly!
    const calculateAll = useCallback((player, currentWeights) => {
        const archerAtlantis = player["Archer Atlantis"] || 0;
        const cavalryAtlantis = player["Cavalry Atlantis"] || 0;
        const siegeAtlantis = player["Siege Atlantis"] || 0;

        const w = currentWeights || {};

        const archer = getNumber(calcs(player, "archer", archerAtlantis, w));
        const cavalry = getNumber(calcs(player, "cavalry", cavalryAtlantis, w));
        const siege = getNumber(calcs(player, "siege", siegeAtlantis, w));

        let multiplier = getNumber(player["Multiplier"]) || 1.5;

        const finalArcher = archer * multiplier;
        const finalCavalry = cavalry * multiplier;
        const finalSiege = siege * multiplier;

        // Apply dynamic ratios (defaulting to 0.5 to act as an average if not set)
        const aRatio = w.archerRatio ?? 0.5;
        const cRatio = w.cavalryRatio ?? 0.5;
        const avgDamage = (finalArcher * aRatio) + (finalCavalry * cRatio);

        return {
            "Final Archer Damage": finalArcher.toFixed(5),
            "Final Cavalry Damage": finalCavalry.toFixed(5),
            "Final Siege Damage": finalSiege.toFixed(5),
            "Average Damage": avgDamage.toFixed(2),
        };
    }, []);

    const handleCopyTable = () => {
        const tsvContent = buildCopyableTable(names, localData, desiredKeys);
        navigator.clipboard.writeText(tsvContent)
            .then(() => setCopySnackbarOpen(true))
            .catch((err) => console.error("Failed to copy:", err));
    };

    const handleEdit = useCallback((name, field, value) => {
        if (!isAdmin) return showNoPermission();
        const updatedPlayer = { ...localData[name], [field]: value };
        
        // `calculateAll` now returns the calculated Average Damage too!
        const calculated = calculateAll(updatedPlayer, statWeights);

        const updatedData = {
            ...updatedPlayer,
            ...calculated
        };

        setLocalData(prev => ({
            ...prev,
            [name]: updatedData
        }));
        onUpdate(name, updatedData);
    }, [isAdmin, localData, calculateAll, onUpdate, showNoPermission, statWeights]);

    const handleThresholdChange = useCallback(async (index, field, value) => {
        if (!isAdmin) return showNoPermission();
        const newThresholds = [...thresholds];
        newThresholds[index] = { ...newThresholds[index], [field]: field === "limit" ? parseFloat(value) || 0 : value };
        setThresholds(newThresholds);

        try { await setDoc(doc(db, "settings", "thresholds"), { thresholds: newThresholds }); }
        catch (error) { console.error("Error updating thresholds:", error); }
    }, [isAdmin, thresholds, showNoPermission]);

    const handleWeightChange = async (key, value) => {
        if (!isAdmin) return showNoPermission();
        
        const numVal = parseFloat(value) || 0;
        const newWeights = { ...statWeights,  [key]: numVal };
        
        setStatWeights(newWeights);

        try { 
            await setDoc(doc(db, "settings", "statWeights"), { weights: newWeights }); 
            
            const updatedPlayers = {};
            
            Object.entries(localData).forEach(([name, playerData]) => {
                const calculated = calculateAll(playerData, newWeights);
                
                const fullUpdatedPlayer = { 
                    ...playerData, 
                    ...calculated 
                };
                
                updatedPlayers[name] = fullUpdatedPlayer;
                onUpdate(name, fullUpdatedPlayer);
            });
            
            setLocalData(updatedPlayers);
            
        } catch (error) { 
            console.error("Error saving weights and updating players:", error); 
        }
    };

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            try {
                const thresholdRef = doc(db, "settings", "thresholds");
                const snapshot = await getDoc(thresholdRef);
                if (snapshot.exists() && snapshot.data().thresholds) setThresholds(snapshot.data().thresholds);

                const optionsRef = doc(db, "settings", "atlantis_damage");
                const optionsSnap = await getDoc(optionsRef);
                if (optionsSnap.exists()) {
                    const optionsArr = Object.entries(optionsSnap.data()).sort((a, b) => Number(a[1]) - Number(b[1]));
                    setArcherOptions(optionsArr);
                    setCavalryOptions(optionsArr);
                    setSiegeOptions(optionsArr);
                }
            } catch (error) { console.error("Failed to load settings:", error); }
            finally { setIsLoading(false); }
        };
        fetchSettings();
    }, []); // Removed setStatWeights from dependency array

    useEffect(() => {
        const updated = {};
        Object.entries(tableData).forEach(([name, data]) => {
            updated[name] = { ...data, ...calculateAll(data, statWeights) };
        });
        setLocalData(updated);
    }, [tableData, calculateAll, statWeights]);

    const handleGroupToggle = (label) => {
        setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
    };

    if (!names.length) return null;
    if (isLoading) return <Stack spacing={1}><Skeleton variant="rectangular" height={40} /><Skeleton variant="rectangular" height={40} /></Stack>;

    return (
        <Suspense fallback={<Box p={4}>Loading...</Box>}>

            <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Configuration & Settings</DialogTitle>
                <DialogContent dividers>

                    <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 'bold', mb: 2 }}>
                        Threshold Colors
                    </Typography>
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                        {thresholds.map((thresh, idx) => (
                            <Grid item xs={12} sm={4} md={3} key={idx}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <TextField label={`Limit ${idx + 1}`} value={thresh.limit} onChange={(e) => handleThresholdChange(idx, "limit", e.target.value)} size="small" type="number" fullWidth />
                                    <Box sx={{ width: 40, height: 40, overflow: 'hidden', borderRadius: 1, border: '1px solid #ccc' }}>
                                        <input type="color" value={thresh.color} onChange={(e) => handleThresholdChange(idx, 'color', e.target.value)} style={{ width: '150%', height: '150%', border: 'none', cursor: 'pointer', margin: '-25%' }} />
                                    </Box>
                                </Stack>
                            </Grid>
                        ))}
                    </Grid>

                    <Divider sx={{ mb: 3 }} />

                    <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 'bold', mb: 2 }}>
                        Stat Ratios (Weights)
                    </Typography>
                    <Grid container spacing={3}>
{weightKeysOrder.map((key) => {
                            // Safely grab the value, default to 0 if it somehow doesn't exist
                            const value = statWeights?.[key] ?? 0; 
                            
                            return (
                                <Grid item xs={6} sm={4} md={3} key={key}>
                                    <TextField
                                        label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                        value={value}
                                        onChange={(e) => handleWeightChange(key, e.target.value)}
                                        size="small"
                                        type="number"
                                        inputProps={{ step: "0.1" }}
                                        fullWidth
                                    />
                                </Grid>
                            );
                        })}
                    </Grid>

                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSettingsOpen(false)} variant="contained">Done</Button>
                </DialogActions>
            </Dialog>

            <Paper elevation={0} sx={{ p: 2, mb: 4, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                        Player Stats Database
                    </Typography>
                    <Box>
                        <Tooltip title="Copy to Clipboard">
                            <IconButton color="secondary" onClick={handleCopyTable}>
                                <ContentCopyIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Configuration Settings">
                            <IconButton color="primary" onClick={() => setSettingsOpen(true)}>
                                <SettingsIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                <TableContainer sx={{ minWidth: isMobile ? 700 : "100%", maxHeight: '75vh', borderRadius: 1, border: '1px solid #f0f0f0' }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ position: 'sticky', left: 0, top: 0, zIndex: 1200, backgroundColor: '#fafafa', borderRight: '2px solid #e0e0e0' }} rowSpan={2}><b>Name</b></TableCell>
                                {columnGroups.map(group => (
                                    <TableCell key={group.label} align="center" colSpan={expandedGroups[group.label] ? group.keys.length : 1} sx={{ backgroundColor: '#fafafa', cursor: "pointer", userSelect: "none", borderRight: "1px solid #e0e0e0" }} onClick={() => handleGroupToggle(group.label)}>
                                        <Box display="flex" alignItems="center" justifyContent="center">
                                            {expandedGroups[group.label] ? <ArrowDropDownIcon fontSize="small" /> : <ArrowRightIcon fontSize="small" />}
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{group.label}</Typography>
                                        </Box>
                                    </TableCell>
                                ))}
                                {extraColumns.map(col => (
                                    <TableCell key={col.key} rowSpan={2} align="center" sx={{ backgroundColor: '#fafafa', minWidth: 80, lineHeight: 1.2 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 600 }}>{col.label}</Typography>
                                    </TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                {columnGroups.map(group =>
                                    expandedGroups[group.label]
                                        ? group.keys.map(key => <TableCell key={`${group.label}-${key}`} align="center" sx={{ backgroundColor: '#fff', borderRight: "1px solid #f8f8f8" }}><Typography variant="caption" color="textSecondary">{key.replace(group.label + " ", "")}</Typography></TableCell>)
                                        : <TableCell key={`${group.label}-collapsed`} sx={{ backgroundColor: '#fff', borderRight: "1px solid #f8f8f8" }} />
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {names.map((name) => {
                                const rowData = localData[name];
                                const archerVal = getNumber(rowData["Final Archer Damage"]);
                                const cavalryVal = getNumber(rowData["Final Cavalry Damage"]);
                                const siegeVal = getNumber(rowData["Final Siege Damage"]);
                                const avgDamage = getNumber(rowData["Average Damage"]);

                                return (
                                    <TableRow key={name} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell align="left" sx={{ position: 'sticky', left: 0, backgroundColor: '#fff', zIndex: 1100, borderRight: '2px solid #e0e0e0' }}>
                                            <CleanInput
                                                value={rowData?.tempName ?? name}
                                                onChange={(e) => setLocalData((prev) => ({ ...prev, [name]: { ...prev[name], tempName: e.target.value } }))}
                                                onBlur={(e) => {
                                                    const newName = e.target.value.trim();
                                                    if (newName && newName !== name) setRenamePrompt({ oldName: name, newName });
                                                }}
                                                width="110px"
                                            />
                                        </TableCell>

                                        {columnGroups.map(group =>
                                            expandedGroups[group.label]
                                                ? group.keys.map(key => (
                                                    <TableCell key={`${name}-${key}`} align="center" sx={{ p: 0.5 }}>
                                                        <CleanInput value={removePercentage(rowData[key]) || ""} onChange={(e) => handleEdit(name, key, e.target.value)} />
                                                    </TableCell>
                                                ))
                                                : <TableCell key={`${name}-${group.label}-collapsed`} sx={{ p: 0 }} />
                                        )}

                                        <TableCell align="center"><CleanInput value={rowData["Lethal Hit Rate"] || ""} onChange={(e) => handleEdit(name, "Lethal Hit Rate", e.target.value)} /></TableCell>

                                        <TableCell align="center">
                                            <Select native variant="standard" disableUnderline value={String(rowData["Archer Atlantis"] || "0")} onChange={(e) => handleEdit(name, "Archer Atlantis", e.target.value)} sx={{ fontSize: '0.875rem', width: '60px' }}>
                                                {archerOptions.map(([label, value]) => <option key={label} value={String(value)}>{label}</option>)}
                                            </Select>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Select native variant="standard" disableUnderline value={String(rowData["Cavalry Atlantis"] || "0")} onChange={(e) => handleEdit(name, "Cavalry Atlantis", e.target.value)} sx={{ fontSize: '0.875rem', width: '60px' }}>
                                                {cavalryOptions.map(([label, value]) => <option key={label} value={String(value)}>{label}</option>)}
                                            </Select>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Select native variant="standard" disableUnderline value={String(rowData["Siege Atlantis"] || "0")} onChange={(e) => handleEdit(name, "Siege Atlantis", e.target.value)} sx={{ fontSize: '0.875rem', width: '60px' }}>
                                                {siegeOptions.map(([label, value]) => <option key={label} value={String(value)}>{label}</option>)}
                                            </Select>
                                        </TableCell>

                                        <TableCell align="center" sx={{ backgroundColor: getColorByThreshold(archerVal, thresholds), fontWeight: 'bold' }}>{archerVal}</TableCell>
                                        <TableCell align="center" sx={{ backgroundColor: getColorByThreshold(cavalryVal, thresholds), fontWeight: 'bold' }}>{cavalryVal}</TableCell>
                                        <TableCell align="center" sx={{ backgroundColor: getColorByThreshold(siegeVal, thresholds), fontWeight: 'bold' }}>{siegeVal}</TableCell>
                                        <TableCell align="center" sx={{ backgroundColor: getColorByThreshold(avgDamage, thresholds), fontWeight: 'bold' }}>{avgDamage.toFixed(2)}</TableCell>

                                        <TableCell align="center">
                                            <IconButton color="error" size="small" onClick={() => onDelete(name)}><DeleteIcon fontSize="small" /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Rename Dialog */}
            {renamePrompt && (
                <Dialog open onClose={() => setRenamePrompt(null)}>
                    <DialogTitle>Confirm Rename</DialogTitle>
                    <DialogContent>Rename <b>{renamePrompt.oldName}</b> to <b>{renamePrompt.newName}</b>?</DialogContent>
                    <DialogActions>
                        <Button onClick={() => setRenamePrompt(null)}>Cancel</Button>
                        <Button variant="contained" onClick={async () => {
                            const { oldName, newName } = renamePrompt;
                            try {
                                const oldRef = doc(db, "stats", oldName);
                                const snap = await getDoc(oldRef);
                                if (!snap.exists()) throw new Error("Not found");
                                await setDoc(doc(db, "stats", newName), snap.data());
                                await deleteDoc(oldRef);
                                setLocalData(prev => {
                                    const updated = { ...prev, [newName]: { ...prev[oldName], tempName: undefined } };
                                    delete updated[oldName];
                                    return updated;
                                });
                                onUpdate(newName, { ...localData[oldName], tempName: undefined });
                                setRenamePrompt(null);
                            } catch (err) { console.error(err); setRenamePrompt(null); }
                        }}>Confirm</Button>
                    </DialogActions>
                </Dialog>
            )}

            <Snackbar open={copySnackbarOpen} autoHideDuration={2000} onClose={() => setCopySnackbarOpen(false)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
                <MuiAlert severity="success" variant="filled" onClose={() => setCopySnackbarOpen(false)}>Table copied!</MuiAlert>
            </Snackbar>
        </Suspense>
    );
}