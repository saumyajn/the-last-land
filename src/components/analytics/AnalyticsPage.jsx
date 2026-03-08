import { useContext, useEffect, useState, } from "react";
import { onSnapshot, doc } from "firebase/firestore";
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

        const unsubscribe = onSnapshot(summaryRef, (docSnap) => {
            if (docSnap.exists()) {

                setCombinedData(docSnap.data());
            } else {
                console.warn("No KPT summary found in DB");
            }
            setLoading(false);
        }, (error) => {
            console.error("Error listening to summary:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

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
                                {TROOP_ORDER.map((type) => {
                                    // Get stats from DB data, fallback to zeros if troop type isn't in DB yet
                                    const stats = combinedData[type] || {
                                        Kills: 0, Losses: 0, Wounded: 0, Survivors: 0, KPT: "0.00"
                                    };
                                    return (
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
                                )})}
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