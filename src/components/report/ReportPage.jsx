import React, { useContext, useEffect, useRef, useState } from "react";
import { db } from "../../utils/firebase";
import { detectText, fileToBase64 } from "../../utils/googleVisions";
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

const templateMap = {
  T10_cavalry: ["T10_cavalry"],
  T10_archer: ["T10_archer"],
  T10_siege: ["T10_siege"],
  T9_cavalry: ["T9_cavalry"],
  T9_archer: ["T9_archer"],
  T8_cavalry: ["T8_cavalry"],
  T8_archer: ["T8_archer"],
  T8_siege: ["T8_siege"],
  T7_cavalry: ["T7_cavalry"],
  T7_archer: ["T7_archer"],

};

const templateKeys = Object.keys(templateMap);
const labels = ["Kills", "Losses", "Wounded", "Survivors"];

export default function ReportPage() {
  const { isAdmin } = useContext(AuthContext);
  const [status, setStatus] = useState("⏳ Waiting for upload...");
  const [structuredResults, setStructuredResults] = useState([]);
  const [mainImage, setMainImage] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [customPlayerName, setCustomPlayerName] = useState("");
  const [playerOptions, setPlayerOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCvLoaded, setIsCvLoaded] = useState(!!(window.cv && window.cv.imread));
  const canvasRef = useRef();
  const { showNoPermission } = usePermissionSnackbar();

  useEffect(() => {
    if (isCvLoaded) return;

    const handleCvLoad = () => {
      setIsCvLoaded(true);
      setStatus("✅ OpenCV Ready");
    };

    window.addEventListener('opencv-loaded', handleCvLoad);
    return () => window.removeEventListener('opencv-loaded', handleCvLoad);
  }, [isCvLoaded]);

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
          tmplImg.src = `/images/${variant}.png`;

          await new Promise((res, rej) => {
            tmplImg.onload = res;
            tmplImg.onerror = rej;
          });

          const tmplColor = cv.imread(tmplImg);
          const originalTemplate = new cv.Mat();
          cv.cvtColor(tmplColor, originalTemplate, cv.COLOR_RGBA2GRAY);
          tmplColor.delete();

          let bestMatch = { maxVal: 0, maxLoc: null, width: 0, height: 0, scale: 1 };
          for (let scale = 0.7; scale <= 1.5; scale += 0.1) {
            const resizedTemplate = new cv.Mat();
            const newWidth = Math.round(originalTemplate.cols * scale);
            const newHeight = Math.round(originalTemplate.rows * scale);
            const dsize = new cv.Size(newWidth, newHeight);

            if (newWidth > src.cols || newHeight > src.rows) {
              resizedTemplate.delete();
              continue;
            }

            cv.resize(originalTemplate, resizedTemplate, dsize, 0, 0, cv.INTER_LINEAR);

            const result = new cv.Mat();
            cv.matchTemplate(src, resizedTemplate, result, cv.TM_CCOEFF_NORMED);
            const { maxVal, maxLoc } = cv.minMaxLoc(result);

            if (maxVal > bestMatch.maxVal) {
              bestMatch = { maxVal, maxLoc, width: newWidth, height: newHeight, scale };
            }

            result.delete();
            resizedTemplate.delete();
          }

          // originalTemplate.delete();
          // const result = new cv.Mat();
          // cv.matchTemplate(src, template, result, cv.TM_CCOEFF_NORMED);
          // const { maxVal, maxLoc } = cv.minMaxLoc(result);
          const threshold = 0.75;
          console.log(`Matching ${variant}: Best maxVal=${bestMatch.maxVal.toFixed(3)} at scale ${bestMatch.scale.toFixed(1)}`);
          // console.log(`Matching ${variant}: maxVal=${maxVal.toFixed(3)} at (${maxLoc.x}, ${maxLoc.y})`);

          if (bestMatch.maxVal >= threshold) {
          const x = bestMatch.maxLoc.x;
            const paddingY = 8; 
            const y = Math.max(0, bestMatch.maxLoc.y - paddingY);
            
            // Use the dynamically found height and width for the crop
            const h = bestMatch.height + (paddingY * 2);
            const rightWidth = mainImage.width - (x + bestMatch.width);

            const cropCanvas = document.createElement("canvas");
            cropCanvas.width = rightWidth;
            cropCanvas.height = h;
            const cropCtx = cropCanvas.getContext("2d");

            
            cropCtx.drawImage(
              mainImage,
              x + bestMatch.width, y,
              rightWidth, h,
              0, 0,
              rightWidth, h
            );

            const base64 = await fileToBase64(await fetch(cropCanvas.toDataURL()).then(r => r.blob()));
            const ocrText = await detectText(base64);

            const cleanValues = ocrText
              .replace(/[Oo]/g, '0')        // Convert letter O to number 0
              .replace(/[,.]/g, '')         // Remove commas so 1,000 becomes 1000
              .replace(/[^0-9\s]/g, ' ')    // Replace other symbols with spaces
              .split(/\s+/)                 // Split by whitespace
              .filter(Boolean)              // Remove empty strings
              .slice(0, labels.length);

            const entry = {};
            labels.forEach((label, i) => {
              entry[label] = cleanValues[i] || "0";
            });

            resultData[troopType] = entry;
            console.log(`Matched ${variant} with values:`, entry);
            matchFound = true;
          }

          originalTemplate.delete();
          // 
          // result.delete();

          if (matchFound) break;
        }
      }

      src.delete();
      if (!isAdmin) {
        showNoPermission();
        return;
      }
      const freshData = {};
      templateKeys.forEach(key => {
        freshData[key] = labels.reduce((acc, label) => ({ ...acc, [label]: "0" }), {});
      });
      for (const [key, value] of Object.entries(resultData)) {
        freshData[key] = { ...freshData[key], ...value };
      }
      await setDoc(doc(db, "reports", finalPlayerName), freshData);

      setStructuredResults((prev = []) => {
        const updated = prev.filter(p => p.name !== finalPlayerName);
        return [{ name: finalPlayerName, data: freshData }, ...updated];
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
          disabled={loading || !isCvLoaded} // Added !isCvLoaded check
        >
          {!isCvLoaded ? "Initializing Engine..." : (loading ? <CircularProgress size={20} /> : "Upload & Scan")}
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary">{status}</Typography>
      <canvas ref={canvasRef} className="hidden-data" />

      {loading ? <CircularProgress color="secondary" /> : (
        <ReportResultTable structuredResults={structuredResults} labels={labels} templateKeys={templateKeys} onEdit={handleEdit} onDelete={handleDelete} />
      )}
    </Box>
  );
}
