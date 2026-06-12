import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
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
import { useState, useMemo } from "react";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import {
  calculateEntryKPT,
  calculateEntryLPT,
  calculateGroupKPT,
  calculateGroupLPT,
} from "../../utils/kptCalculations";

const archerKeys = ["T10_archer", "T9_archer", "T8_archer", "T7_archer", "T6_archer"];
const cavalryKeys = ["T10_cavalry", "T9_cavalry", "T8_cavalry", "T7_cavalry"];
const siegeKeys = ["T10_siege",  "T8_siege"];

export default function ReportResultTable({
  structuredResults,
  labels,
  templateKeys,
  onEdit,
  onDelete
}) {
  const [copySnackbarOpen, setCopySnackbarOpen] = useState(false);
  const handleCopy = (player) => {
    let text = `📋 ${player.name}\n\n`;

    text += "Type\t" + labels.join("\t") + "\tKPT\tLPT\n";

    templateKeys.forEach((tmplKey) => {
      const rowData = player.data?.[tmplKey] || {};
      const kpt = handleKPT(rowData);
      const lpt = handleLPT(rowData);

      text += tmplKey + "\t";
      labels.forEach((label) => {
        text += (rowData[label] || "0") + "\t";
      });
      text += `${kpt}\t${lpt}\n`;
    });

    navigator.clipboard.writeText(text)
      .then(() => {
        setCopySnackbarOpen(true);
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
      });
  };


  const handleKPT = (data) => {
    return calculateEntryKPT(data);
  }

  const handleLPT = (data) => {
    return calculateEntryLPT(data);
  }


  const memoizedPlayers = useMemo(() => {
    return structuredResults.map(player => ({
      ...player,
      archerKPT: calculateGroupKPT(player.data, archerKeys),
      cavalryKPT: calculateGroupKPT(player.data, cavalryKeys),
      siegeKPT: calculateGroupKPT(player.data, siegeKeys),
      archerLPT: calculateGroupLPT(player.data, archerKeys),
      cavalryLPT: calculateGroupLPT(player.data, cavalryKeys),
      siegeLPT: calculateGroupLPT(player.data, siegeKeys)
    }));
  }, [structuredResults]);
  return (
    <>
      {memoizedPlayers.map((player) => {
        const { archerKPT, cavalryKPT, siegeKPT, archerLPT, cavalryLPT, siegeLPT } = player;

        return (
          <Paper key={player.name} elevation={0} sx={{ mt: 3, p: { xs: 1.5, md: 2 }, borderRadius: 2, border: "1px solid rgba(15,23,42,0.08)", boxShadow: "0 18px 45px rgba(15,23,42,0.06)" }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 1.5, flexDirection: { xs: 'column', md: 'row' } }}>
              <Typography variant="h6">📊 {player.name}</Typography>
              <Typography variant="body2">Archer KPT/LPT: {archerKPT} / {archerLPT}</Typography>
              <Typography variant="body2">Cavalry KPT/LPT: {cavalryKPT} / {cavalryLPT}</Typography>
               <Typography variant="body2">Siege KPT/LPT: {siegeKPT} / {siegeLPT}</Typography>
              <IconButton color="primary" onClick={() => handleCopy(player)}>
                <ContentCopyIcon />
              </IconButton>
              <IconButton color="error" onClick={() => onDelete(player.name)}>
                <DeleteIcon />
              </IconButton>
            </Box>

            <TableContainer sx={{ mt: 2, borderRadius: 1, border: "1px solid rgba(15,23,42,0.08)" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><b>Type</b></TableCell>
                    {labels.map((label) => (
                      <TableCell key={label}><b>{label}</b></TableCell>
                    ))}
                    <TableCell><b>KPT</b></TableCell>
                    <TableCell><b>LPT</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {templateKeys.map((tmplKey) => {
                    const rowData = player.data?.[tmplKey] || {};
                    const kpt = handleKPT(rowData);
                    const lpt = handleLPT(rowData);

                    return (
                      <TableRow key={tmplKey}>
                        <TableCell>{tmplKey}</TableCell>
                        {labels.map((label) => (
                          <TableCell key={label}>
                            <TextField
                              size="small"
                              value={rowData[label] || "0"}
                              onChange={(e) => onEdit(player.name, tmplKey, label, e.target.value)}
                              sx={{ width: 92 }}
                            />
                          </TableCell>
                        ))}


                        <TableCell> {kpt}</TableCell>
                        <TableCell> {lpt}</TableCell>

                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>

          </Paper>

        )
      }
      )}
      <Snackbar
        open={copySnackbarOpen}
        autoHideDuration={2000}
        onClose={() => setCopySnackbarOpen(false)}
        message="Table copied!"
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <MuiAlert
          elevation={6}
          variant="filled"
          severity="success"
          onClose={() => setCopySnackbarOpen(false)}
          sx={{ width: "100%" }}
        >
          Table copied!
        </MuiAlert></Snackbar></>
  )
}
