import DeleteIcon from "@mui/icons-material/Delete";
import {
  Box,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,

} from "@mui/material";

const archerKeys = ["T10_archer", "T9_archer", "T8_archer", "T7_archer", "T6_archer"];
const cavalryKeys = ["T10_cavalry", "T9_cavalry", "T8_cavalry", "T7_cavalry"];

export default function ReportResultTable({
  structuredResults,
  labels,
  templateKeys,
  onEdit,
  onDelete
}) {
  const handleKPT = (data) => {
    const kills = parseInt(data?.Kills || "0");
    const losses = parseInt(data?.Losses || "0");
    const wounded = parseInt(data?.Wounded || "0");
    const survivors = parseInt(data?.Survivors || "0");
    return computeKPT(kills, losses, wounded, survivors);
  }

  const computeKPT = (kills, losses, wounded, survivors) => {
    const total = kills - (losses + wounded);
    if (survivors === 0) return "0.00";
    return (total / survivors).toFixed(2);
  };

  const calcKPT = (data, keys) => {
    let totalKillsMinusLossWound = 0;
    let totalSurvivors = 0;
  
    keys.forEach((key) => {
      const entry = data[key];
      if (entry) {
        const kills = parseInt(entry.Kills || 0);
        const losses = parseInt(entry.Losses || 0);
        const wounded = parseInt(entry.Wounded || 0);
        const survivors = parseInt(entry.Survivors || 0);
  
        totalKillsMinusLossWound += (kills - (losses + wounded));
        totalSurvivors += survivors;
      }
    });
  
    return computeKPT(totalKillsMinusLossWound, 0, 0, totalSurvivors);
  };
  return (
    <>
      {structuredResults.map((player, pIdx) => {
        const archerKPT = calcKPT(player.data, archerKeys);
        const cavalryKPT = calcKPT(player.data, cavalryKeys);

        return (
          <Box key={player.name} sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">📊 {player.name}</Typography>
              <Typography variant="h8">Archer: {archerKPT}</Typography>
              <Typography variant="h8">Calavry: {cavalryKPT}</Typography>
              <IconButton color="error" onClick={() => onDelete(player.name)}>
                <DeleteIcon />
              </IconButton>
            </Box>
            
            <TableContainer component={Paper} sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><b>Type</b></TableCell>
                    {labels.map((label) => (
                      <TableCell key={label}><b>{label}</b></TableCell>
                    ))}
                    <TableCell><b>KPT</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {templateKeys.map((tmplKey) => {
                    const rowData = player.data?.[tmplKey] || {};
                    const kpt = handleKPT(rowData);

                    return (
                      <TableRow key={tmplKey}>
                        <TableCell>{tmplKey}</TableCell>
                        {labels.map((label) => (
                          <TableCell key={label}>
                            <TextField
                              size="small"
                              value={rowData[label] || "0"}
                              onChange={(e) => onEdit(pIdx, tmplKey, label, e.target.value)}
                              style={{ width: '100px' }}
                            />
                          </TableCell>
                        ))}


                        <TableCell> {kpt}</TableCell>

                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )
      }
      )}</>
  )
}