import React, { useEffect, useRef, useState } from "react";
import { db } from "../utils/firebase";
import { doc, setDoc, deleteDoc, getDocs, collection } from "firebase/firestore";
import {fileToBase64, detectText} from '../utils/googleVisions'
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
  Button
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

export default function ReportPage() {
  const [status, setStatus] = useState("⏳ Waiting for upload...");
  const [structuredResults, setStructuredResults] = useState([]);
  const [mainImage, setMainImage] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const canvasRef = useRef();

  const templates = [
    "T10_cavalry", "T9_cavalry", "T8_cavalry", "T7_cavalry",
    "T10_archer", "T9_archer", "T8_archer", "T7_archer", "T6_archer"
  ];

  const labels = ["Kills", "Losses", "Wounded", "Survivors"];

  useEffect(() => {
    const fetchAllReports = async () => {
      try {
        const snapshot = await getDocs(collection(db, "reports"));
        const allResults = [];
        snapshot.forEach(docSnap => {
          const name = docSnap.id;
          const data = Object.values(docSnap.data())[0];
          allResults.push({ name, data });
        });
        setStructuredResults(allResults);
      } catch (err) {
        console.error("Error fetching report data:", err);
      }
    };
    fetchAllReports();
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => setMainImage(img);
  };

  const processImage = async () => {
    if (!mainImage || !playerName) {
      setStatus("❌ Please select an image and enter a player name.");
      return;
    }

    if (!window.cv || !cv.imread) {
      setStatus("⏳ Initializing OpenCV...");
      return setTimeout(processImage, 200);
    }

    try {
      setStatus("📸 Processing image...");
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      canvas.width = mainImage.width;
      canvas.height = mainImage.height;
      ctx.drawImage(mainImage, 0, 0);

      const src = cv.imread(mainImage);
      const results = [];

      for (let i = 0; i < templates.length; i++) {
        const tmplName = templates[i];
        setStatus(`🔍 Matching ${tmplName}...`);

        const tmplImg = new Image();
        tmplImg.crossOrigin = "anonymous";
        tmplImg.src = `/images/${tmplName}.jpg`;

        await new Promise((res, rej) => {
          tmplImg.onload = res;
          tmplImg.onerror = rej;
        });

        const template = cv.imread(tmplImg);
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
          const text = await detectText(base64);
          console.log(text)

          const cleanValues = text
            .replace(/[^0-9\s]/g, '')
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, labels.length);

          const entry = { name: tmplName };
          labels.forEach((label, i) => {
            entry[label] = cleanValues[i] || "0";
          });

          results.push(entry);
        }

        template.delete();
        result.delete();
      }

      src.delete();
      const payload = { [playerName]: results };
      await setDoc(doc(db, "reports", playerName), payload);

      setStructuredResults((prev) => {
        const updated = [...prev];
        const index = updated.findIndex(p => p.name === playerName);
        if (index !== -1) {
          updated[index].data = results;
        } else {
          updated.push({ name: playerName, data: results });
        }
        return updated;
      });
      
      setStatus("✅ Match results saved.");
    } catch (err) {
      console.error("Matching failed", err);
      setStatus("❌ Error during image processing");
    }
  };

  const handleEdit = (playerIdx, rowIdx, key, value) => {
    const updated = [...structuredResults];
    updated[playerIdx].data[rowIdx][key] = value;
    setStructuredResults(updated);
  };

  const handleDelete = async (name) => {
    await deleteDoc(doc(db, "reports", name));
    setStructuredResults((prev) => prev.filter((p) => p.name !== name));
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5">🧠 Image Match & Data Extraction</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 2 }}>
        <TextField
          label="Player Name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        <input type="file" accept="image/*" onChange={handleImageUpload} />
        <Button variant="contained" onClick={processImage}>
          Upload & Scan
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary">{status}</Typography>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {structuredResults.map((player, pIdx) => (
        <Box key={player.name} sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">📊 {player.name}</Typography>
            <IconButton color="error" onClick={() => handleDelete(player.name)}>
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
                {player.data.map((row, rIdx) => (
                  <TableRow key={rIdx}>
                    <TableCell>{row.name}</TableCell>
                    {labels.map((label) => (
                      <TableCell key={label}>
                        <TextField
                          size="small"
                          value={row[label]}
                          onChange={(e) => handleEdit(pIdx, rIdx, label, e.target.value)}
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
      ))}
    </Box>
  );
}
