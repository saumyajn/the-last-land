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
                </TableRow>
              </TableHead>
              <TableBody>
                {templateKeys.map((tmplKey) => (
                    <TableRow key={tmplKey}>
                      <TableCell>{tmplKey}</TableCell>
                      {labels.map((label) => (
                        <TableCell key={label}>
                          <TextField
                            size="small"
                            value={player.data?.[tmplKey]?.[label] || "0"}
                            onChange={(e) => onEdit(pIdx, tmplKey, label, e.target.value)}
                            fullWidth
                          />
                        </TableCell>
                      ))}

                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}</>
  )
}