import { useContext, useEffect, useState, } from "react";
import { onSnapshot, doc, setDoc } from "firebase/firestore"; // Added setDoc
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
    Divider, Skeleton, Stack,
    TableFooter
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AnalyticsSummary from "./AnalyticsSummary";
import ExportToGoogleSheet from './ExportSheets';
import { AuthContext } from "../../utils/authContext";

const TROOP_ORDER = [
    "T10_guards", "T10_cavalry", "T10_archer", "T10_siege",
    "T9_cavalry", "T9_archer", "T8_cavalry", "T8_archer",
    "T8_siege", "T7_cavalry", "T7_archer"
];

export default function AnalyticsPage() {
    const { isAdmin } = useContext(AuthContext);
    const [combinedData, setCombinedData] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const summaryRef = doc(db, "analytics", "troop_type_kpt");

        const unsubscribe = onSnapshot(summaryRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCombinedData(data);

                // 1. Calculate Totals (excluding T10_guards)
                const totals = Object.entries(data)
                    .filter(([key]) => key !== 'T10_guards')
                    .reduce((acc, [, stats]) => {
                        acc.Kills += (stats.Kills || 0);
                        acc.Losses += (stats.Losses || 0);
                        acc.Wounded += (stats.Wounded || 0);
                        acc.Survivors += (stats.Survivors || 0);
                        return acc;
                    }, { Kills: 0, Losses: 0, Wounded: 0, Survivors: 0 });

                const totalDenominator = totals.Losses + totals.Wounded + totals.Survivors;
                const totalKPTValue = totalDenominator > 0 ? (totals.Kills / totalDenominator) : 0;
                
                // 2. Prepare detailed calculated data for the DB summary document
                const troopSummaryDetails = {};
                Object.entries(data).forEach(([type, stats]) => {
                    let marchSize = totalKPTValue > 0 ? (stats.Kills || 0) / totalKPTValue : 0;
                    if (type === 'T10_guards') marchSize = 0;

                    troopSummaryDetails[type] = {
                        ...stats,
                        calculatedMarchSize: Math.round(marchSize),
                        marchPercentage: totalDenominator > 0 
                            ? ((marchSize / totalDenominator) * 100).toFixed(2) + "%" 
                            : "0.00%"
                    };
                });

                // 3. Update the database summary document if the user is an admin
                if (isAdmin) {
                    try {
                        await setDoc(doc(db, "analytics", "troop_type_summary"), {
                            totals: {
                                ...totals,
                                KPT: totalKPTValue.toFixed(3),
                                totalMarchSize: totalDenominator
                            },
                            troopDetails: troopSummaryDetails,
                            updatedAt: new Date().toISOString()
                        });
                    } catch (err) {
                        console.error("Error updating troop type summary in DB:", err);
                    }
                }
            } else {
                console.warn("No KPT summary found in DB");
            }
            setLoading(false);
        }, (error) => {
            console.error("Error listening to summary:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isAdmin]); // Added isAdmin to dependencies to handle permission-based writing

    if (loading) return (
        <Stack spacing={1}>
            <Skeleton variant="rectangular" height={60} />
            <Skeleton variant="rectangular" height={60} />
            <Skeleton variant="rectangular" height={60} />
        </Stack>
    );

    const totals = Object.entries(combinedData)
        .filter(([key]) => key !== 'T10_guards')
        .reduce((acc, [, stats]) => {
            acc.Kills += (stats.Kills || 0);
            acc.Losses += (stats.Losses || 0);
            acc.Wounded += (stats.Wounded || 0);
            acc.Survivors += (stats.Survivors || 0);
            return acc;
        }, { Kills: 0, Losses: 0, Wounded: 0, Survivors: 0 });

    const totalDenominator = totals.Losses + totals.Wounded + totals.Survivors;
    const totalKPTValue = totalDenominator > 0 ? (totals.Kills / totalDenominator) : 0;
    totals.KPT = totalKPTValue.toFixed(3);
    const totalMarchSize = totalDenominator;

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
                                    <TableCell><b>March Size</b></TableCell>
                                    <TableCell><b>% of March</b></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {TROOP_ORDER.map((type) => {
                                    const stats = combinedData[type] || {
                                        Kills: 0, Losses: 0, Wounded: 0, Survivors: 0, KPT: "0.00"
                                    };

                                    let marchSize = totalKPTValue > 0 ? (stats.Kills || 0) / totalKPTValue : 0;
                                    let marchPercent = totalMarchSize > 0 ? `${((marchSize / totalMarchSize) * 100).toFixed(2)}%` : "0.00%";

                                    if (type === 'T10_guards') {
                                        marchSize = 0;
                                        marchPercent = "0.00%";
                                    }

                                    return (
                                    <TableRow key={type}>
                                        <TableCell>{type}</TableCell>
                                        <TableCell>{stats.Kills.toLocaleString()}</TableCell>
                                        <TableCell>{stats.Losses.toLocaleString()}</TableCell>
                                        <TableCell>{stats.Wounded.toLocaleString()}</TableCell>
                                        <TableCell>{stats.Survivors.toLocaleString()}</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>
                                            {stats.KPT}
                                        </TableCell>
                                        <TableCell>{Math.round(marchSize).toLocaleString()}</TableCell>
                                        <TableCell>{marchPercent}</TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell><b>Total</b></TableCell>
                                    <TableCell>{totals.Kills.toLocaleString()}</TableCell>
                                    <TableCell>{totals.Losses.toLocaleString()}</TableCell>
                                    <TableCell>{totals.Wounded.toLocaleString()}</TableCell>
                                    <TableCell>{totals.Survivors.toLocaleString()}</TableCell>
                                    <TableCell>{totals.KPT}</TableCell>
                                    <TableCell>{totalMarchSize.toLocaleString()}</TableCell>
                                    <TableCell>100.00%</TableCell>
                                </TableRow>
                            </TableFooter>
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