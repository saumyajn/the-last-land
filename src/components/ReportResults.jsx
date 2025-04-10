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
    const denominator = losses + wounded + survivors;
    if (denominator === 0) return "0.00";
    return (kills / denominator).toFixed(2);
  }
  return (
    <>
      {structuredResults.map((player, pIdx) => (
        <Box key={player.name} sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">📊 {player.name}</Typography>
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
      ))}</>
  )
}