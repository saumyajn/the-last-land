import React, { useEffect, useState } from "react";
import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import { db } from "../utils/firebase";
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
  Divider
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AnalyticsSummary from "./AnalyticsSummary";
export default function AnalyticsPage() {
    const [combinedData, setCombinedData] = useState({});

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const troopTypes = [
                    "T10_cavalry", "T9_cavalry", "T8_cavalry", "T7_cavalry",
                    "T10_archer", "T9_archer", "T8_archer", "T7_archer", "T6_archer"
                ];
                const reportSnapshot = await getDocs(collection(db, "reports"));
                const troopTotals = {};
                troopTypes.forEach(type => {
                    troopTotals[type] = {
                        Kills: 0,
                        Losses: 0,
                        Wounded: 0,
                        Survivors: 0,
                        KPT:"0.00"
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
                    const total = Losses + Wounded + Survivors;
                    troopTotals[type].KPT = total === 0 ? "0.00" : (Kills / total).toFixed(2);
                }
                await setDoc(doc(db, "analytics", "troop_type_kpt"), troopTotals);
                setCombinedData(troopTotals);
            } catch (error) {
                console.error("Error fetching troop data:", error);
            }
        }
        fetchReports();
    }, [])
    return (
        <Box>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Troop Type KPT Summary</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <TableContainer component={Paper}>
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
                                        <TableCell>{stats.Kills}</TableCell>
                                        <TableCell>{stats.Losses}</TableCell>
                                        <TableCell>{stats.Wounded}</TableCell>
                                        <TableCell>{stats.Survivors}</TableCell>
                                        <TableCell>{stats.KPT}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </AccordionDetails>
            </Accordion>
             <Divider sx={{ m: 2 }} />
            <AnalyticsSummary/>
        </Box>
    )
}