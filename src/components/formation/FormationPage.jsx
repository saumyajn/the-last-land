import React, { useContext, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Grid,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  IconButton,
  Tooltip
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FormationForm from "./FormationForm";
import FormationTable from "./FormationTable";
import { AuthContext } from "../../utils/authContext";

export default function FormationPage({ groupedData = {}, groupedCavalryData = {}, thresholds = [] }) {
  const groupedAverageData = {};
  const sortedColors = thresholds.slice().sort((a, b) => b.limit - a.limit);
  // const colorMap = Object.fromEntries(sortedColors.map(t => [t.color, t.name]));

  Object.entries(groupedData).forEach(([_, archerGroup]) => {
    archerGroup.slice(1).forEach((archerPlayer) => {
      const name = archerPlayer.name;
      const archerDmg = archerPlayer.damage || 0;
      const cavalryDmg = Object.values(groupedCavalryData)
        .flat()
        .find(p => p.name === name)?.damage || 0;
      const avg = (archerDmg + cavalryDmg) / 2;

      const matchedThreshold = sortedColors.find(t => avg >= t.limit);
      const color = matchedThreshold?.color || "default";
      const colorName = matchedThreshold?.name || "Default";

      if (!groupedAverageData[color]) {
        groupedAverageData[color] = [{ colorName, avgDamage: 0 }];
      }
      groupedAverageData[color].push({ name, damage: avg });
    });
  });

  // Compute average per color group
  for (const color in groupedAverageData) {
    const players = groupedAverageData[color].slice(1);
    const total = players.reduce((sum, p) => sum + (p.damage || 0), 0);
    const avg = players.length ? total / players.length : 0;
    groupedAverageData[color][0].avgDamage = parseFloat(avg.toFixed(2));
  }

  const { user, isAdmin } = useContext(AuthContext);
  const [form1, setForm1] = useState({ total: "", guards: "", archers: "", cavalry: "", at10: "", at9: "", at8: "", at7: "", ct10: "", ct9: "", ct8: "", ct7: ""});
  const [form2, setForm2] = useState({ total: "", guards: "", archers: "", cavalry: "", at10: "", at9: "", at8: "", at7: "", ct10: "", ct9: "", ct8: "", ct7: "" });
  const [form3, setForm3] = useState({ total: "", guards: "", archers: "", cavalry: "", at10: "", at9: "", at8: "", at7: "", ct10: "", ct9: "", ct8: "", ct7: ""});
  const [form4, setForm4] = useState({ total: "", guards: "", archers: "", cavalry: "", at10: "", at9: "", at8: "", at7: "", ct10: "", ct9: "", ct8: "", ct7: ""});

  const colorSortOrder = thresholds.map(t => t.color);
  const getSortedGroups = (data) =>
    Object.keys(data).sort((a, b) => colorSortOrder.indexOf(b) - colorSortOrder.indexOf(a));

  const handleCopy = (players, color) => {
    const groupName = players[0]?.colorName || color;
    const text = players.slice(2).map(p => ` ${p.name || p}`).join(", ");
    navigator.clipboard.writeText(`${groupName}- ${text}`);
  };
  const paperStyles = {
    p: 3,
    borderRadius: 3,
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    transition: 'box-shadow 0.3s',
    '&:hover': {
      boxShadow: '0px 4px 16px rgba(0,0,0,0.05)',
    },
  };

  const titleStyles = {
    mb: 2,
    fontWeight: "bold",
    color: 'primary.dark',
    textAlign: 'center',
  };
  const renderGroupAccordion = (label, data) => {
    const groups = getSortedGroups(data);
    return (
      <Accordion sx={{ borderRadius: 2, mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{
          bgcolor: '#e3f2fd' }}>
          <Typography variant="h6" color="primary.dark">{label}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {groups.map((color) => {
            const meta = data[color];
            const colorName = meta[0]?.colorName || color;
            const avgDamage = Math.round(meta[0]?.avgDamage || 0);
            if (!meta || meta.length <= 1 || isNaN(avgDamage) || avgDamage === 0) {
              return (
                <Paper key={color} sx={{ mb: 2, borderLeft: `10px solid ${color}`, p: 1 }}>
                  <Typography variant="subtitle2" sx={{ ml: 1 }}>
                    {colorName} - Avg Damage: 0
                  </Typography>
                  <Divider sx={{ mb: 0.5 }} />
                </Paper>
              );
            }
            return (
              <Paper key={color} sx={{ mb: 2, borderLeft: `10px solid ${color}`, p: 2 ,  bgcolor: alpha(color, 0.1)}}>
                <Typography variant="subtitle2" sx={{ ml: 1 }}>
                  {colorName.toUpperCase()} - Avg Damage: {avgDamage}
                </Typography>
                <Divider sx={{ my: 0.5 }} />
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  {meta.slice(1).map((player, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        backgroundColor: "#f0f4ff",
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 2,
                        fontSize: 14,
                        color: "#1e3a8a",
                        fontWeight: 500,
                        border: "1px solid #bbdefb"
                      }}
                    >
                    {player.name}
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
      {renderGroupAccordion("Average Damage", groupedAverageData)}

      <Divider sx={{ mb: 2 }} />

      {/* TOWER FORMATION BLOCK */}
     <Box sx={{ mb: 4, backgroundColor: '#fdf9ff', p: 3, borderRadius: 3, border: '1px solid #e0e0e0' }}>

       <Typography variant="h5" sx={{ fontWeight: "bold", mb: 2, color: '#0d47a1' }}>
          TOWER FORMATION
        </Typography>
        <Grid spacing={3}>
          {/* Archer Tower */}
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={paperStyles}>
              <Typography variant="h6" sx={titleStyles}>Archer Formation</Typography>
              <FormationForm label="Tower Formation" formState={form1} setFormState={setForm1} isAdmin={isAdmin} type="archer" />
              <FormationTable label="tower_formation" groupedData={groupedData} isAdmin={isAdmin} type="archer" />
            </Paper>
          </Grid>

          {/* Cavalry Tower */}
          <Grid item xs={12} md={6} sx={{ mt: 3 }}>
            <Paper elevation={1} sx={paperStyles}>
              <Typography variant="h6" sx={titleStyles}>Cavalry Formation</Typography>
              <FormationForm label="Tower Formation" formState={form3} setFormState={setForm3} isAdmin={isAdmin} type="cavalry" />
              <FormationTable label="tower_formation" groupedData={groupedCavalryData} isAdmin={isAdmin} type="cavalry" />
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* THRONE FORMATION BLOCK */}
       <Box sx={{ mb: 4, backgroundColor: '#fdf9ff', p: 3, borderRadius: 3, border: '1px solid #e0e0e0' }}>

         <Typography variant="h5" sx={{ fontWeight: "bold", mb: 2, color: '#0d47a1' }}>
          THRONE FORMATION
        </Typography>
        <Grid spacing={3}>
          {/* Archer Throne */}
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={paperStyles}>
              <Typography variant="h6" sx={titleStyles}>Archer Formation</Typography>
              <FormationForm label="Throne Formation" formState={form2} setFormState={setForm2} isAdmin={isAdmin} type="archer" />
              <FormationTable label="throne_formation" groupedData={groupedData} isAdmin={isAdmin} type="archer" />
            </Paper>
          </Grid>

          {/* Cavalry Throne */}
          <Grid item xs={12} md={6} sx={{ mt: 3 }}>
            <Paper elevation={1} sx={paperStyles}>
              <Typography variant="h6" sx={titleStyles}>Cavalry Formation</Typography>
              <FormationForm label="Throne Formation" formState={form4} setFormState={setForm4} isAdmin={isAdmin} type="cavalry" />
              <FormationTable label="throne_formation" groupedData={groupedCavalryData} isAdmin={isAdmin} type="cavalry" />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );

}
