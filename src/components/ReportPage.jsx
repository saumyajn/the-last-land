import React, { useEffect, useRef, useState } from "react";
import { db } from "../utils/firebase";
import { detectText, fileToBase64 } from "../utils/googleVisions";
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
import { usePermissionSnackbar } from "./Permissions";
import ReportResultTable from "./ReportResults";

export default function ReportPage({ isAdmin }) {
  const [status, setStatus] = useState("⏳ Waiting for upload...");
  const [structuredResults, setStructuredResults] = useState([]);
  const [mainImage, setMainImage] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [customPlayerName, setCustomPlayerName] = useState("");
  const [playerOptions, setPlayerOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef();
  const { showNoPermission } = usePermissionSnackbar();

  const templateMap = {
    T10_cavalry: ["T10_cavalry", "T10_cavalry1"],
    T10_archer: ["T10_archer", "T10_archer1"],
    T9_cavalry: ["T9_cavalry", "T9_cavalry1"],
    T9_archer: ["T9_archer", "T9_archer1"],
    T8_cavalry: ["T8_cavalry", "T8_cavalry1"],
    T8_archer: ["T8_archer", "T8_archer1"],
    T7_cavalry: ["T7_cavalry", "T7_cavalry1"],
    T7_archer: ["T7_archer", "T7_archer1"],
    T6_archer: ["T6_archer", "T6_archer1"]
  };

  const templateKeys = Object.keys(templateMap);
  const labels = ["Kills", "Losses", "Wounded", "Survivors"];

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
      setStructuredResults(allResults);
      setLoading(false);
    };
    fetchAllReports();
  }, [labels, templateKeys]);

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
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => setMainImage(img);
            setStatus("📥 Image pasted from clipboard");
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
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => setMainImage(img);
  };

  const processImage = async () => {
    const finalPlayerName = playerName === "__custom__" ? customPlayerName : playerName;

    if (!mainImage || !finalPlayerName) {
      setStatus("❌ Please select an image and enter a player name.");
      return;
    }

    if (!window.cv || !cv.imread) {
      setStatus("⏳ Initializing OpenCV...");
      return setTimeout(processImage, 200);
    }

    try {
      setLoading(true);
      setStatus("📸 Processing image...");
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      canvas.width = mainImage.width;
      canvas.height = mainImage.height;
      ctx.drawImage(mainImage, 0, 0);

      const srcColor = cv.imread(mainImage);
      const src = new cv.Mat();
      cv.cvtColor(srcColor, src, cv.COLOR_RGBA2GRAY);
      srcColor.delete();

      const resultData = {};

      for (const [troopType, variants] of Object.entries(templateMap)) {
        let matchFound = false;

        for (const variant of variants) {
          setStatus(`🔍 Matching ${variant}...`);

          const tmplImg = new Image();
          tmplImg.crossOrigin = "anonymous";
          tmplImg.src = `/images/${variant}.jpg`;

          await new Promise((res, rej) => {
            tmplImg.onload = res;
            tmplImg.onerror = rej;
          });

          const tmplColor = cv.imread(tmplImg);
          const template = new cv.Mat();
          cv.cvtColor(tmplColor, template, cv.COLOR_RGBA2GRAY);
          tmplColor.delete();

          const result = new cv.Mat();
          cv.matchTemplate(src, template, result, cv.TM_CCOEFF_NORMED);
          const { maxVal, maxLoc } = cv.minMaxLoc(result);
          const threshold = 0.8;

          if (maxVal >= threshold) {
            const x = maxLoc.x;
            const y = maxLoc.y;
            const h = template.rows;
            const rightWidth = mainImage.width - (x + template.cols);

            const cropCanvas = document.createElement("canvas");
            cropCanvas.width = rightWidth;
            cropCanvas.height = h;
            const cropCtx = cropCanvas.getContext("2d");
            cropCtx.drawImage(
              mainImage,
              x + template.cols, y,
              rightWidth, h,
              0, 0,
              rightWidth, h
            );

            const base64 = await fileToBase64(await fetch(cropCanvas.toDataURL()).then(r => r.blob()));
            const ocrText = await detectText(base64);

            const cleanValues = ocrText
              .replace(/[^0-9\s]/g, '')
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, labels.length);

            const entry = {};
            labels.forEach((label, i) => {
              entry[label] = cleanValues[i] || "0";
            });

            resultData[troopType] = entry;
            matchFound = true;
          }

          template.delete();
          result.delete();

          if (matchFound) break;
        }
      }

      src.delete();
      if (!isAdmin) {
        showNoPermission();
        return;
      }
      await setDoc(doc(db, "reports", finalPlayerName), resultData);
      setStructuredResults((prev) => {
        const updated = [...prev];
        const index = updated.findIndex(p => p.name === finalPlayerName);
        if (index !== -1) {
          updated[index].data = resultData;
        } else {
          updated.push({ name: finalPlayerName, data: resultData });
        }
        return updated;
      });
      setStatus("✅ Match results saved.");
    } catch (err) {
      console.error("Matching failed", err);
      setStatus("❌ Error during image processing");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (playerIdx, tmplKey, key, value) => {
    if (!isAdmin) {
      showNoPermission();
      return;
    }
    const updated = [...structuredResults];
    const player = updated[playerIdx];

    if (!player || !player.data?.[tmplKey]) return;

    player.data[tmplKey][key] = value;
    // 🔁 Recalculate KPT per row
    const getKPT = (data) => {
      const kills = parseInt(data?.Kills || "0");
      const losses = parseInt(data?.Losses || "0");
      const wounded = parseInt(data?.Wounded || "0");
      const survivors = parseInt(data?.Survivors || "0");
      const total = losses + wounded + survivors;
      return total === 0 ? "0.00" : (kills / total).toFixed(2);
    };

    // 🔁 Calculate group-level KPTs
    const calcGroupKPT = (keys) => {
      let kills = 0, troops = 0;
      keys.forEach(k => {
        const d = player.data[k] || {};
        kills += parseInt(d.Kills || 0);
        troops += parseInt(d.Losses || 0) + parseInt(d.Wounded || 0) + parseInt(d.Survivors || 0);
      });
      return troops === 0 ? "0.00" : (kills / troops).toFixed(2);
    };

    const rowKPT = getKPT(player.data[tmplKey]);
    const archerKPT = calcGroupKPT(["T10_archer", "T9_archer", "T8_archer", "T7_archer", "T6_archer"]);
    const cavalryKPT = calcGroupKPT(["T10_cavalry", "T9_cavalry", "T8_cavalry", "T7_cavalry"]);

    player.data[tmplKey].KPT = rowKPT;
    player.archerKPT = archerKPT;
    player.cavalryKPT = cavalryKPT;

    setStructuredResults(updated);
    if (!isAdmin) {
      showNoPermission();
      return;
    }
    // 🔥 Update to Firebase
    try {
      await setDoc(doc(db, "reports", player.name), {
        ...player.data,
        archerKPT,
        cavalryKPT
      });
      console.log("✅ Updated Firestore with KPTs");
    } catch (err) {
      console.error("❌ Error updating Firestore:", err);
    }
  };


  const handleDelete = async (name) => {
    if (!isAdmin) {
      showNoPermission();
      return;
    }
    await deleteDoc(doc(db, "reports", name));
    setStructuredResults((prev) => prev.filter((p) => p.name !== name));
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom color="primary">🧠 Report Extraction</Typography>
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
            <option value=" ">Other...</option>
          </Select>
        </FormControl>
        {playerName === " " && (
          <TextField
            label="Enter Custom Name"
            value={customPlayerName}
            onChange={(e) => setCustomPlayerName(e.target.value)}
          />
        )}
        <input type="file" accept="image/*" onChange={handleImageUpload} />
        <Button variant="contained" onClick={processImage} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : "Upload & Scan"}
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary">{status}</Typography>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {loading ? <CircularProgress color="secondary" /> : (
        <ReportResultTable structuredResults={structuredResults} labels={labels} templateKeys={templateKeys} onEdit={handleEdit} onDelete={handleDelete} />
      )}
    </Box>
  );
}
