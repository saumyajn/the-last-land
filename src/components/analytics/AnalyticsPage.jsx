import React, { useContext, useEffect, useState, useCallback } from "react";
import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import { db } from "../../utils/firebase";
import {
    Box,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Divider, Skeleton, Stack
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AnalyticsSummary from "./AnalyticsSummary";
import ExportToGoogleSheet from './ExportSheets';
import { AuthContext } from "../../utils/authContext";

export default function AnalyticsPage() {
    const { isAdmin } = useContext(AuthContext);
    const [combinedData, setCombinedData] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchReports = useCallback(async () => {
        try {
            const troopTypes = [
                "T10_siege", "T10_cavalry", "T9_cavalry", "T8_cavalry", "T7_cavalry",
                "T10_archer", "T9_archer", "T8_archer", "T7_archer"
            ];

            // Optimization: Consider querying only recent reports if list is large
            const reportSnapshot = await getDocs(collection(db, "reports"));

            const troopTotals = {};
            troopTypes.forEach(type => {
                troopTotals[type] = {
                    Kills: 0,
                    Losses: 0,
                    Wounded: 0,
                    Survivors: 0,
                    KPT: "0.00"
                };
            });

            reportSnapshot.forEach(docSnap => {
                const data = docSnap.data();
                troopTypes.forEach(type => {
                    if (data[type]) {
                        troopTotals[type].Kills += parseInt(data[type].Kills || 0);
                        troopTotals[type].Losses += parseInt(data[type].Losses || 0);
                        troopTotals[type].Wounded += parseInt(data[type].Wounded || 0);
                        troopTotals[type].Survivors += parseInt(data[type].Survivors || 0);
                    }
                });
            });

            for (const type of troopTypes) {
                const { Kills, Losses, Wounded, Survivors } = troopTotals[type];
                const numerator = Kills - (Losses + Wounded);
                troopTotals[type].KPT = Survivors === 0 ? "0.00" : (numerator / Survivors).toFixed(2);
            }

            setCombinedData(troopTotals);

            // Write summary only once after calculation
            if (isAdmin) {
                await setDoc(doc(db, "analytics", "troop_type_kpt"), troopTotals);
            }

        } catch (error) {
            console.error("Error fetching troop data:", error);
        } finally {
            setLoading(false);
        }
    }, [isAdmin]);

    // FIX: Added dependency array to prevent infinite loop
    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    if (loading) return (
        <Stack spacing={1}>
            <Skeleton variant="rectangular" height={60} />
            <Skeleton variant="rectangular" height={60} />
            <Skeleton variant="rectangular" height={60} />
        </Stack>
    );

    return (
        <Box>
            <Accordion defaultExpanded sx={{ borderRadius: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Troop Type KPT Summary</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell><b>Troop Type</b></TableCell>
                                    <TableCell><b>Kills</b></TableCell>
                                    <TableCell><b>Losses</b></TableCell>
                                    <TableCell><b>Wounded</b></TableCell>
                                    <TableCell><b>Survivors</b></TableCell>
                                    <TableCell><b>KPT</b></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.entries(combinedData).map(([type, stats]) => (
                                    <TableRow key={type}>
                                        <TableCell>{type}</TableCell>
                                        <TableCell>{stats.Kills.toLocaleString()}</TableCell>
                                        <TableCell>{stats.Losses.toLocaleString()}</TableCell>
                                        <TableCell>{stats.Wounded.toLocaleString()}</TableCell>
                                        <TableCell>{stats.Survivors.toLocaleString()}</TableCell>
                                        <TableCell sx={{
                                            fontWeight: 'bold',

                                        }}>
                                            {stats.KPT}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </AccordionDetails>
            </Accordion>
            <Divider sx={{ m: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {isAdmin && (
                    <Box sx={{ alignSelf: 'flex-end' }}>
                        <ExportToGoogleSheet />
                    </Box>
                )}
                <AnalyticsSummary isAdmin={isAdmin} />
            </Box>
        </Box>
    );
}