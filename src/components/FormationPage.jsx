import React, { useState } from "react";
import {
    Box,
    Typography,
    Stack,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Divider,
    IconButton,
    Tooltip
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FormationForm from "./FormationForm";
import FormationTable from "./FormationTable";

export default function FormationPage({ groupedData = {}, groupedCavalryData = {}, thresholds = [] }) {
    const [form1, setForm1] = useState({ total: "", guards: "", archers: "", cavalry: "", t10: "", t9: "", t8: "", t7: "", t6: "" });
    const [form2, setForm2] = useState({ total: "", guards: "", archers: "", cavalry: "", t10: "", t9: "", t8: "", t7: "", t6: "" });

    const sortedColors = thresholds
        .slice()
        .sort((a, b) => b.limit - a.limit)
        .map((t) => t.color);

    const getSortedGroups = (data) =>
        Object.keys(data).sort((a, b) => sortedColors.indexOf(a) - sortedColors.indexOf(b));

    const handleCopy = (players, color) => {
        const groupName = players[0]?.colorName || color;
        const text = players.slice(2).map(p => ` ${p.name || p}`).join(", ");
        navigator.clipboard.writeText(`${groupName}- ${text}`);
    };

    const renderGroupAccordion = (label, data) => {
        const groups = getSortedGroups(data);
        return (
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" sx={{ fontWeight: "bold" }}>{label}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    {groups.map((color) => {
                        const meta = data[color];
                        const colorName = meta[0]?.colorName || color;
                        const avgDamage = Math.round(meta[0]?.avgDamage || 0);

                        return (
                            <Paper key={color} sx={{ mb: 2, borderLeft: `10px solid ${color}`, p: 1 }}>
                                <Typography variant="subtitle2" sx={{ ml: 1 }}>
                                    {colorName} - Avg Damage: {avgDamage}
                                </Typography>
                                <Divider sx={{ mb: 0.5 }} />
                                <Stack direction="row" spacing={1}>
                                    {meta.slice(1).map((player, idx) => (
                                        <Box
                                            key={idx}
                                            sx={{
                                                backgroundColor: "#f8f8f8",
                                                px: 1,
                                                py: 1,
                                                borderRadius: 1
                                            }}
                                        >
                                            <Typography>{player.name}</Typography>
                                        </Box>
                                    ))}
                                    <Tooltip title="Copy names">
                                        <IconButton size="small" onClick={() => handleCopy(meta, color)}>
                                            <ContentCopyIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                            </Paper>
                        );
                    })}
                </AccordionDetails>
            </Accordion>
        );
    };

    return (
        <Box sx={{ mt: 4 }}>
            {renderGroupAccordion("Final Archer Damage", groupedData)}
            {renderGroupAccordion("Final Cavalry Damage", groupedCavalryData)}

            <Divider sx={{ mb: 2 }} />
            <Typography sx={{ backgroundColor: '#e8f4f8' }} variant="h5">ARCHER FORMATION</Typography>
            <Box sx={{ mb: 4 }}>
                <FormationForm label="Tower Formation" formState={form1} setFormState={setForm1} />
                <FormationTable label="tower_formation" groupedData={groupedData} />
            </Box>
            <Box>
                <FormationForm label="Throne Formation" formState={form2} setFormState={setForm2} />
                <FormationTable label="throne_formation" groupedData={groupedData} />
            </Box>
        </Box>
    );
}
