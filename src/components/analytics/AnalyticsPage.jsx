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
import { TROOP_ORDER } from "../../utils/appConstants";
import { calculateTroopTypeSummary } from "../../utils/troopSummaryCalculations";

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
                const summary = calculateTroopTypeSummary(data);

                // 3. Update the database summary document if the user is an admin
                if (isAdmin) {
                    try {
                        await setDoc(doc(db, "analytics", "troop_type_summary"), {
                            ...summary,
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

    const summary = calculateTroopTypeSummary(combinedData);
    const { totals, troopDetails } = summary;
    const totalMarchSize = totals.totalMarchSize;

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Accordion
                defaultExpanded
                disableGutters
                sx={{
                    borderRadius: 2,
                    overflow: "hidden",
                    border: "1px solid rgba(15,23,42,0.08)",
                    boxShadow: "0 18px 45px rgba(15,23,42,0.06)",
                    "&:before": { display: "none" },
                }}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: "background.paper" }}>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: "text.primary" }}>Troop Type KPT Summary</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Aggregated report outcomes and calculated march share by troop type.
                        </Typography>
                    </Box>
                </AccordionSummary>
                <AccordionDetails>
                    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 1, border: "1px solid rgba(15,23,42,0.08)" }}>
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

                                    const summaryStats = troopDetails[type] || {};
                                    const marchSize = summaryStats.calculatedMarchSize || 0;
                                    const marchPercent = summaryStats.marchPercentage || "0.00%";

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
                                        <TableCell>{marchSize.toLocaleString()}</TableCell>
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
            <Divider sx={{ my: 1 }} />
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
