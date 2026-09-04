import React, { useContext, useEffect, useRef, useState } from "react";
import { db } from "../../utils/firebase";
import { extractGameData, fileToBase64 } from "../../utils/googleVisions";
import { doc, setDoc, deleteDoc, getDocs, collection } from "firebase/firestore";
import {
  Box,
  TextField,
  Typography,
  Button,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Paper,
  Stack,
  Alert,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { usePermissionSnackbar } from "../Permissions";
import ReportResultTable from "./ReportResults";
import { AuthContext } from "../../utils/authContext";
import { updateTroopTypeKpt } from "../../utils/dbActions";
import { REPORT_LABELS, TROOP_ORDER } from "../../utils/appConstants";
import {
  calculateEntryKPT,
  calculateEntryLPT,
  calculateGroupKPT,
  calculateGroupLPT,
} from "../../utils/kptCalculations";
import {
  GEMINI_REPORT_VIDEO_PROMPT,
  parseManualGeminiReportImport,
} from "../../utils/manualGeminiReportImport";

const templateKeys = TROOP_ORDER;
const labels = REPORT_LABELS;
const CUSTOM_PLAYER_VALUE = "__custom__";

const getFinalManualPlayerName = (row) =>
  (row.selectedPlayerName === CUSTOM_PLAYER_VALUE ? row.customPlayerName : row.selectedPlayerName).trim();

export default function ReportPage() {
  const { isAdmin } = useContext(AuthContext);
  const [status, setStatus] = useState("Waiting for upload...");
  const [structuredResults, setStructuredResults] = useState([]);
  const [mainImageFile, setMainImageFile] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [customPlayerName, setCustomPlayerName] = useState("");
  const [playerOptions, setPlayerOptions] = useState([]);
  const [manualGeminiText, setManualGeminiText] = useState("");
  const [manualImportRows, setManualImportRows] = useState([]);
  const [manualImportError, setManualImportError] = useState("");
  const [loading, setLoading] = useState(true);
  const mainImageUrlRef = useRef(null);
  const { showNoPermission } = usePermissionSnackbar();

  const setMainImageFromFile = (file, nextStatus) => {
    if (mainImageUrlRef.current) {
      URL.revokeObjectURL(mainImageUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(file);
    mainImageUrlRef.current = objectUrl;
    setMainImageFile(file);

    if (nextStatus) {
      setStatus(nextStatus);
    }
  };

  useEffect(() => {
    return () => {
      if (mainImageUrlRef.current) {
        URL.revokeObjectURL(mainImageUrlRef.current);
      }
    };
  }, []);



  useEffect(() => {
    const fetchAllReports = async () => {
      const snapshot = await getDocs(collection(db, "reports"));
      const allResults = [];
      snapshot.forEach(docSnap => {
        const name = docSnap.id;
        const data = docSnap.data();
        templateKeys.forEach(key => {
          if (!data[key]) {
            data[key] = labels.reduce((acc, label) => {
              acc[label] = "0";
              return acc;
            }, {});
          }
        });
        allResults.push({ name, data });
      });
      setStructuredResults(prev => {
        const updated = prev.filter(p => !allResults.some(d => d.name === p.name));
        return [...allResults, ...updated];
      });
      setLoading(false);
    };
    fetchAllReports();
  }, []);

  useEffect(() => {
    const fetchPlayerOptions = async () => {
      const snapshot = await getDocs(collection(db, "stats"));
      const names = snapshot.docs.map(doc => doc.id);
      setPlayerOptions(names);
    };
    fetchPlayerOptions();
  }, []);

  useEffect(() => {
    const handlePaste = (event) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            setMainImageFromFile(file);
            setStatus("Image pasted from clipboard.");
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMainImageFromFile(file, "Image selected.");
  };

  const processImage = async () => {
    const finalPlayerName = playerName === CUSTOM_PLAYER_VALUE ? customPlayerName : playerName;
    if (!mainImageFile || !finalPlayerName) {
      setStatus("Please select an image and enter a player name.");
      return;
    }

    try {
      setLoading(true);
      setStatus("Processing image extraction...");

      const base64 = await fileToBase64(mainImageFile);
      const extractedData = await extractGameData(base64, "REPORT")
      if (!isAdmin) {
        showNoPermission();
        return;
      }

      const freshData = {};
      templateKeys.forEach(key => {
        freshData[key] = labels.reduce((acc, label) => ({ ...acc, [label]: "0" }), {});
      });
      for (const [key, value] of Object.entries(extractedData)) {
        freshData[key] = { ...freshData[key], ...value };
      }

      await setDoc(doc(db, "reports", finalPlayerName), freshData);

      await updateTroopTypeKpt(isAdmin);

      setStructuredResults((prev = []) => {
        const updated = prev.filter(p => p.name !== finalPlayerName);
        return [{ name: finalPlayerName, data: freshData }, ...updated];
      });

      setStatus("Report extracted and global analytics updated.");
    } catch (err) {
      console.error("Extraction failed", err);
      setStatus(`Extraction failed: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyGeminiPrompt = async () => {
    try {
      await navigator.clipboard.writeText(GEMINI_REPORT_VIDEO_PROMPT);
      setManualImportError("");
      setStatus("Gemini video prompt copied.");
    } catch (error) {
      setManualImportError("Could not copy the prompt. Select the prompt text and copy it manually.");
    }
  };

  const handleManualGeminiParse = () => {
    try {
      const rows = parseManualGeminiReportImport(manualGeminiText, playerOptions).map((row) => ({
        ...row,
        selectedPlayerName: row.matchedPlayerName || CUSTOM_PLAYER_VALUE,
        customPlayerName: row.matchedPlayerName ? "" : row.rawPlayerName,
      }));

      if (!rows.length) {
        throw new Error("No report rows were found in the pasted Gemini response.");
      }

      setManualImportRows(rows);
      setManualImportError("");
      setStatus(`Parsed ${rows.length} video report${rows.length === 1 ? "" : "s"} from Gemini.`);
    } catch (error) {
      setManualImportRows([]);
      setManualImportError(error.message || "Could not parse Gemini response.");
    }
  };

  const handleManualImportChoice = (rowId, value) => {
    setManualImportRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              selectedPlayerName: value,
              customPlayerName: value === CUSTOM_PLAYER_VALUE ? row.customPlayerName || row.rawPlayerName : "",
            }
          : row,
      ),
    );
  };

  const handleManualImportCustomName = (rowId, value) => {
    setManualImportRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, customPlayerName: value } : row)),
    );
  };

  const saveManualGeminiReports = async () => {
    if (!isAdmin) {
      showNoPermission();
      return;
    }

    const rowsToSave = manualImportRows.map((row) => ({
      ...row,
      finalPlayerName: getFinalManualPlayerName(row),
    }));
    const missingName = rowsToSave.find((row) => !row.finalPlayerName);
    if (missingName) {
      setManualImportError("Every Gemini report needs a saved player name before importing.");
      return;
    }

    const duplicateNames = rowsToSave
      .map((row) => row.finalPlayerName.toLowerCase())
      .filter((name, index, names) => names.indexOf(name) !== index);
    if (duplicateNames.length) {
      setManualImportError("Two imported reports are mapped to the same player. Review duplicates before saving.");
      return;
    }

    try {
      setLoading(true);
      setStatus("Saving Gemini video reports...");

      await Promise.all(
        rowsToSave.map((row) => setDoc(doc(db, "reports", row.finalPlayerName), row.data)),
      );

      await updateTroopTypeKpt(isAdmin);

      setStructuredResults((prev = []) => {
        const savedNames = new Set(rowsToSave.map((row) => row.finalPlayerName));
        const updated = prev.filter((player) => !savedNames.has(player.name));
        return [
          ...rowsToSave.map((row) => ({ name: row.finalPlayerName, data: row.data })),
          ...updated,
        ];
      });

      setManualImportRows([]);
      setManualGeminiText("");
      setManualImportError("");
      setStatus(`Saved ${rowsToSave.length} Gemini video report${rowsToSave.length === 1 ? "" : "s"}.`);
    } catch (error) {
      console.error("Manual Gemini import failed", error);
      setManualImportError(error.message || "Could not save Gemini video reports.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (targetPlayerName, tmplKey, key, value) => {
    if (!isAdmin) {
      showNoPermission();
      return;
    }
    let updatedPlayer = null;

    const updatedResults = structuredResults.map((player) => {
      if (player.name === targetPlayerName) {
        const newData = {
          ...player.data,
          [tmplKey]: {
            ...player.data[tmplKey],
            [key]: value
          }
        };
        updatedPlayer = { ...player, data: newData };
        return updatedPlayer;
      }
      return player;
    });

    if (!updatedPlayer) return;

    updatedPlayer.data[tmplKey].KPT = calculateEntryKPT(updatedPlayer.data[tmplKey]);
    updatedPlayer.data[tmplKey].LPT = calculateEntryLPT(updatedPlayer.data[tmplKey]);
    updatedPlayer.archerKPT = calculateGroupKPT(updatedPlayer.data, ["T10_archer", "T9_archer", "T8_archer", "T7_archer", "T6_archer"]);
    updatedPlayer.archerLPT = calculateGroupLPT(updatedPlayer.data, ["T10_archer", "T9_archer", "T8_archer", "T7_archer", "T6_archer"]);
    updatedPlayer.cavalryKPT = calculateGroupKPT(updatedPlayer.data, ["T10_cavalry", "T9_cavalry", "T8_cavalry", "T7_cavalry"]);
    updatedPlayer.cavalryLPT = calculateGroupLPT(updatedPlayer.data, ["T10_cavalry", "T9_cavalry", "T8_cavalry", "T7_cavalry"]);

    setStructuredResults(updatedResults);

    try {
      await setDoc(doc(db, "reports", targetPlayerName), {
        ...updatedPlayer.data,
        archerKPT: updatedPlayer.archerKPT,
        archerLPT: updatedPlayer.archerLPT,
        cavalryKPT: updatedPlayer.cavalryKPT,
        cavalryLPT: updatedPlayer.cavalryLPT
      }, { merge: true });

      await updateTroopTypeKpt(isAdmin);

    } catch (err) {
      console.error("Error updating Firestore:", err);
    }
  };

  const handleDelete = async (name) => {
    if (!isAdmin) {
      showNoPermission();
      return;
    }

    await deleteDoc(doc(db, "reports", name));

    await updateTroopTypeKpt(isAdmin);

    setStructuredResults((prev) => prev.filter((p) => p.name !== name));
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom color="primary">Report Extraction</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Player Name</InputLabel>
          <Select
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            label="Player Name"
            native
          >
            <option value=""> </option>
            {playerOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
            <option value={CUSTOM_PLAYER_VALUE}>Other...</option>
          </Select>
        </FormControl>
        {playerName === CUSTOM_PLAYER_VALUE && (
          <TextField
            label="Enter Custom Name"
            value={customPlayerName}
            onChange={(e) => setCustomPlayerName(e.target.value)}
          />
        )}
        <input type="file" accept="image/*" onChange={handleImageUpload} />
        <Button
          variant="contained"
          onClick={processImage}
          disabled={loading}
        >
          {loading ? <CircularProgress size={20} /> : "Upload & Scan"}
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary">{status}</Typography>

      {isAdmin && (
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            p: { xs: 1.5, md: 2 },
            borderRadius: 2,
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: "0 18px 45px rgba(15,23,42,0.06)",
          }}
        >
          <Stack spacing={2}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, gap: 1.5, flexDirection: { xs: "column", sm: "row" } }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Gemini Video Import
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Use Gemini for the video, then paste the JSON here to match and save reports.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                component="a"
                href="https://gemini.google.com/app"
                target="_blank"
                rel="noreferrer"
                variant="outlined"
              >
                Open Gemini
              </Button>
            </Stack>
          </Box>

          <Accordion
            disableGutters
            elevation={0}
            sx={{
              border: "1px solid rgba(15,23,42,0.08)",
              borderRadius: 1,
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, width: "100%" }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                    Gemini Prompt
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Open only when you need to view or copy the exact video instructions.
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleCopyGeminiPrompt();
                  }}
                  onFocus={(event) => event.stopPropagation()}
                >
                  Copy Prompt
                </Button>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <TextField
                value={GEMINI_REPORT_VIDEO_PROMPT}
                multiline
                minRows={3}
                maxRows={4}
                InputProps={{ readOnly: true }}
                fullWidth
              />
            </AccordionDetails>
          </Accordion>

          <TextField
            label="Paste Gemini JSON response"
            value={manualGeminiText}
            onChange={(event) => setManualGeminiText(event.target.value)}
            multiline
            minRows={5}
            fullWidth
          />

          {manualImportError && <Alert severity="warning">{manualImportError}</Alert>}

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button
              variant="outlined"
              onClick={handleManualGeminiParse}
              disabled={!manualGeminiText.trim()}
            >
              Parse Response
            </Button>
          </Box>

          {manualImportRows.length > 0 && (
            <>
              <Divider />
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                  Review Matched Reports
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip
                    size="small"
                    label={`Matched ${manualImportRows.filter((row) => row.selectedPlayerName !== CUSTOM_PLAYER_VALUE).length}`}
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    label={`Other ${manualImportRows.filter((row) => row.selectedPlayerName === CUSTOM_PLAYER_VALUE).length}`}
                    color="warning"
                    variant="outlined"
                  />
                </Stack>
              </Box>

              <Stack spacing={1.25}>
                {manualImportRows.map((row) => (
                  <Box
                    key={row.id}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "1.1fr 1fr 1fr" },
                      alignItems: "center",
                      gap: 1,
                      p: 1.25,
                      borderRadius: 1,
                      border: "1px solid rgba(15,23,42,0.08)",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {row.rawPlayerName || "Unnamed report"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.timestamp ? `${row.timestamp} | ` : ""}Match: {row.matchConfidence}
                      </Typography>
                    </Box>

                    <FormControl size="small" fullWidth>
                      <InputLabel>Save As</InputLabel>
                      <Select
                        value={row.selectedPlayerName}
                        onChange={(event) => handleManualImportChoice(row.id, event.target.value)}
                        label="Save As"
                        native
                      >
                        <option value={CUSTOM_PLAYER_VALUE}>Other / custom</option>
                        {playerOptions.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </Select>
                    </FormControl>

                    {row.selectedPlayerName === CUSTOM_PLAYER_VALUE ? (
                      <TextField
                        label="Custom Name"
                        size="small"
                        value={row.customPlayerName}
                        onChange={(event) => handleManualImportCustomName(row.id, event.target.value)}
                        fullWidth
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Ready to save over {row.selectedPlayerName}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>

              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="contained"
                  onClick={saveManualGeminiReports}
                  disabled={loading}
                >
                  Save Accepted Reports
                </Button>
              </Box>
            </>
          )}
          </Stack>
        </Paper>
      )}
    

      {loading ? <CircularProgress color="secondary" /> : (
        <ReportResultTable
          structuredResults={structuredResults}
          labels={labels}
          templateKeys={templateKeys}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </Box>
  );
}

