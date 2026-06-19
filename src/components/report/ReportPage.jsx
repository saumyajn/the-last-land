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
  CircularProgress
} from "@mui/material";
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

const templateKeys = TROOP_ORDER;
const labels = REPORT_LABELS;

export default function ReportPage() {
  const { isAdmin } = useContext(AuthContext);
  const [status, setStatus] = useState("Waiting for upload...");
  const [structuredResults, setStructuredResults] = useState([]);
  const [mainImageFile, setMainImageFile] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [customPlayerName, setCustomPlayerName] = useState("");
  const [playerOptions, setPlayerOptions] = useState([]);
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
    const finalPlayerName = playerName === "__custom__" ? customPlayerName : playerName;
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
            <option value="__custom__">Other...</option>
          </Select>
        </FormControl>
        {playerName === "__custom__" && (
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

