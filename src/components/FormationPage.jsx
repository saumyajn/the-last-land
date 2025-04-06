import React from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export default function FormationPage({ groupedData = {}, groupedCavalryData = {}, thresholds = [] }) {
 
  const sortedColors = thresholds
    .slice()
    .sort((a, b) => b.limit - a.limit)
    .map((t) => t.color);

  const getSortedGroups = (data) =>
    Object.keys(data).sort((a, b) => sortedColors.indexOf(a) - sortedColors.indexOf(b));

  const renderGroupAccordion = (label, data) => {
    const groups = getSortedGroups(data);
    return (
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>{label}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {groups.map((color) => (
            
            <Paper key={color} sx={{ mb: 2, borderLeft: `10px solid ${color}`, p: 1 }}>
             
              <Divider sx={{ mb: 0.5 }} />
              <Stack direction="row" spacing={1}>
                {data[color].map((player, idx) => (
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
              </Stack>
            </Paper>
          ))}
        </AccordionDetails>
      </Accordion>
    );
  };

  return (
    <Box sx={{ mt: 4 }}>
      {renderGroupAccordion("Final Archer Damage", groupedData)}
      {renderGroupAccordion("Final Cavalry Damage", groupedCavalryData)}
    </Box>
  );
}
