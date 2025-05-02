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
import { useState } from "react";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
const archerKeys = ["T10_archer", "T9_archer", "T8_archer", "T7_archer", "T6_archer"];
const cavalryKeys = ["T10_cavalry", "T9_cavalry", "T8_cavalry", "T7_cavalry"];

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

    text += "Type\t" + labels.join("\t") + "\tKPT\n";

    templateKeys.forEach((tmplKey) => {
      const rowData = player.data?.[tmplKey] || {};
      const kpt = handleKPT(rowData);

      text += tmplKey + "\t";
      labels.forEach((label) => {
        text += (rowData[label] || "0") + "\t";
      });
      text += kpt + "\n";
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
    const kills = parseInt(data?.Kills || "0");
    const losses = parseInt(data?.Losses || "0");
    const wounded = parseInt(data?.Wounded || "0");
    const survivors = parseInt(data?.Survivors || "0");
    return computeKPT(kills, losses, wounded, survivors);
  }

  const computeKPT = (kills, losses, wounded, survivors) => {
    const total = losses + wounded + survivors;
    if (total === 0) return "0.00";
    return (kills / total).toFixed(2);
  };

  const calcKPT = (data, keys) => {
    let kills = 0, losses = 0, wounded = 0, survivors = 0;


    keys.forEach((key) => {
      const entry = data[key];
      if (entry) {
        kills += parseInt(entry.Kills || 0);
        losses += parseInt(entry.Losses || 0);
        wounded += parseInt(entry.Wounded || 0);
        survivors += parseInt(entry.Survivors || 0);

      }
    });

    return computeKPT(kills, losses, wounded, survivors);
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
              <IconButton color="primary" onClick={() => handleCopy(player)}>
                <ContentCopyIcon />
              </IconButton>
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