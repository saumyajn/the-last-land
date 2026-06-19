import React, { useContext, useEffect, useRef, useState } from "react";
import { db } from "../../utils/firebase";
import { detectText, detectTextWithWords, fileToBase64 } from "../../utils/googleVisions";
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
import {
  buildReportEntryFromOcr,
  DEFAULT_REPORT_CROP_WIDTH_MULTIPLIER,
  DEFAULT_REPORT_MATCH_THRESHOLD,
  DEFAULT_REPORT_OCR_SCALE,
  rectanglesOverlap,
  parseReportTableOneToOne,
} from "../../utils/reportExtraction";
import { ensureOpenCvReady, isOpenCvReady } from "../../utils/opencvLoader";

const templateMap = Object.fromEntries(TROOP_ORDER.map((troopType) => [troopType, [troopType]]));
const templateKeys = Object.keys(templateMap);
const labels = REPORT_LABELS;

export default function ReportPage() {
  const { isAdmin } = useContext(AuthContext);
  const [status, setStatus] = useState("⏳ Waiting for upload...");
  const [structuredResults, setStructuredResults] = useState([]);
  const [mainImage, setMainImage] = useState(null);
  const [mainImageFile, setMainImageFile] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [customPlayerName, setCustomPlayerName] = useState("");
  const [playerOptions, setPlayerOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setIsCvLoaded] = useState(isOpenCvReady());
  const [, setCvLoadError] = useState(false);
  const canvasRef = useRef();
  const mainImageUrlRef = useRef(null);
  const { showNoPermission } = usePermissionSnackbar();

  const getImageSelectedStatus = () =>
    isOpenCvReady()
      ? "Image selected"
      : "Image selected. OpenCV is still initializing...";

  const setMainImageFromFile = (file, nextStatus) => {
    if (mainImageUrlRef.current) {
      URL.revokeObjectURL(mainImageUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    mainImageUrlRef.current = objectUrl;
    setMainImageFile(file);

    const img = new Image();
    img.src = objectUrl;
    img.onload = () => setMainImage(img);
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
    let isMounted = true;

    if (isOpenCvReady()) {
      setIsCvLoaded(true);
      setStatus("✅ OpenCV Ready");
      return () => {
        isMounted = false;
      };
    }

    ensureOpenCvReady()
      .then(() => {
        if (!isMounted) return;
        setCvLoadError(false);
        setIsCvLoaded(true);
        setStatus("✅ OpenCV Ready");
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error("OpenCV failed to initialize:", error);
        setCvLoadError(true);
        setIsCvLoaded(false);
        setStatus("❌ OpenCV failed to load. Check your network and refresh the page.");
      });

    return () => {
      isMounted = false;
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
            setStatus(
              isOpenCvReady()
                ? "📥 Image pasted from clipboard"
                : "📥 Image pasted. OpenCV is still initializing...",
            );
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
    setMainImageFromFile(file, getImageSelectedStatus());
  };

  const processImage = async () => {
    const finalPlayerName = playerName === "__custom__" ? customPlayerName : playerName;

    if (!mainImageFile && !isOpenCvReady()) {
      setIsCvLoaded(false);
      setStatus("⏳ OpenCV is still initializing. Please wait a moment and try again.");
      return;
    }

    if (!mainImageFile || !finalPlayerName) {
      setStatus("❌ Please select an image and enter a player name.");
      return;
    }

    try {
      setLoading(true);
      setStatus("Running whole-image OCR...");

      if (mainImageFile) {
        const base64 = await fileToBase64(mainImageFile);
        const ocrResult = await detectTextWithWords(base64);
        const parsedReport = parseReportTableOneToOne(ocrResult.words, {
          labels,
          rowKeys: TROOP_ORDER,
          rowTolerance: 18,
        });

        if (!parsedReport.isValid) {
          if (process.env.NODE_ENV === "development") {
            console.log("Strict report extraction failed:", parsedReport);
          }

          const details = [
            parsedReport.debug?.missingHeaders?.length ? `missing headers: ${parsedReport.debug.missingHeaders.join(", ")}` : "",
            parsedReport.debug?.missingRows?.length ? `missing rows: ${parsedReport.debug.missingRows.join(", ")}` : "",
            parsedReport.debug?.missingCells?.length ? `missing cells: ${parsedReport.debug.missingCells.length}` : "",
            parsedReport.debug?.ambiguousCells?.length ? `ambiguous cells: ${parsedReport.debug.ambiguousCells.length}` : "",
          ].filter(Boolean).join("; ");

          setStatus(`No report saved. Strict table extraction failed (${parsedReport.reason})${details ? `: ${details}` : "."}`);
          return;
        }

        if (!isAdmin) {
          showNoPermission();
          return;
        }

        const freshData = {};
        templateKeys.forEach(key => {
          freshData[key] = labels.reduce((acc, label) => ({ ...acc, [label]: "0" }), {});
        });
        for (const [key, value] of Object.entries(parsedReport.entriesByTroopType)) {
          freshData[key] = { ...freshData[key], ...value };
        }

        await setDoc(doc(db, "reports", finalPlayerName), freshData);
        await updateTroopTypeKpt(isAdmin);

        setStructuredResults((prev = []) => {
          const updated = prev.filter(p => p.name !== finalPlayerName);
          return [{ name: finalPlayerName, data: freshData }, ...updated];
        });

        setStatus("Report saved from strict whole-image OCR and analytics updated.");
        return;
      }
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
      const acceptedMatches = [];
      let bestCandidate = { troopType: "", score: 0 };

      for (const [troopType, variants] of Object.entries(templateMap)) {
        if (resultData[troopType]) continue;
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

          if (process.env.NODE_ENV === "development") {
            console.log(`Matching ${variant}: Best maxVal=${bestMatch.maxVal.toFixed(3)} at scale ${bestMatch.scale.toFixed(1)}`);
          }
          if (bestMatch.maxVal > bestCandidate.score) {
            bestCandidate = { troopType: variant, score: bestMatch.maxVal };
          }

          if (bestMatch.maxVal >= DEFAULT_REPORT_MATCH_THRESHOLD) {
            const x = bestMatch.maxLoc.x;
            const paddingY = 8; 
            const y = Math.max(0, bestMatch.maxLoc.y - paddingY);
            
            const h = bestMatch.height + (paddingY * 2);
            const matchRect = { x, y, width: bestMatch.width, height: h };
            const overlappingMatch = acceptedMatches.find((match) =>
              rectanglesOverlap(match.rect, matchRect),
            );

            if (overlappingMatch && overlappingMatch.score >= bestMatch.maxVal) {
              if (process.env.NODE_ENV === "development") {
                console.log(
                  `Skipped ${variant}: overlaps ${overlappingMatch.troopType} with an equal or higher score.`,
                );
              }
              originalTemplate.delete();
              continue;
            }

            const cropX = x + bestMatch.width;
            const maxCropWidth = Math.round(bestMatch.width * DEFAULT_REPORT_CROP_WIDTH_MULTIPLIER);
            const rightWidth = Math.min(mainImage.width - cropX, maxCropWidth);
            if (rightWidth <= 0) {
              originalTemplate.delete();
              continue;
            }

            const cropCanvas = document.createElement("canvas");
            cropCanvas.width = rightWidth * DEFAULT_REPORT_OCR_SCALE;
            cropCanvas.height = h * DEFAULT_REPORT_OCR_SCALE;
            const cropCtx = cropCanvas.getContext("2d");
            cropCtx.imageSmoothingEnabled = false;

            cropCtx.drawImage(
              mainImage,
              cropX, y,
              rightWidth, h,
              0, 0,
              cropCanvas.width, cropCanvas.height
            );

            const cropBlob = await new Promise((resolve) => {
              cropCanvas.toBlob(resolve, "image/png");
            });
            if (!cropBlob) {
              originalTemplate.delete();
              continue;
            }

            const base64 = await fileToBase64(cropBlob);
            const ocrText = await detectText(base64);
            const { entry, isValid, values } = buildReportEntryFromOcr(ocrText, labels);

            if (!isValid) {
              if (process.env.NODE_ENV === "development") {
                console.log(`Skipped ${variant}: OCR did not produce a full report row.`, values, ocrText);
              }
              originalTemplate.delete();
              continue;
            }

            if (overlappingMatch) {
              delete resultData[overlappingMatch.troopType];
              const overlappingIndex = acceptedMatches.indexOf(overlappingMatch);
              if (overlappingIndex >= 0) {
                acceptedMatches.splice(overlappingIndex, 1);
              }
              if (process.env.NODE_ENV === "development") {
                console.log(
                  `Replacing ${overlappingMatch.troopType} (${overlappingMatch.score.toFixed(3)}) with ${variant} (${bestMatch.maxVal.toFixed(3)}) for the same row.`,
                );
              }
            }

            resultData[troopType] = entry;
            acceptedMatches.push({ troopType, rect: matchRect, score: bestMatch.maxVal });
            if (process.env.NODE_ENV === "development") {
              console.log(`Matched ${variant} with values:`, entry);
            }
            matchFound = true;
          }

          originalTemplate.delete();

          if (matchFound) break;
        }
      }

      src.delete();

      if (Object.keys(resultData).length === 0) {
        const bestScore = bestCandidate.score.toFixed(3);
        setStatus(
          `⚠️ No report rows were extracted, so nothing was saved. Best icon match: ${bestCandidate.troopType || "none"} (${bestScore}); threshold is ${DEFAULT_REPORT_MATCH_THRESHOLD}.`,
        );
        return;
      }

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
      
      // Save the individual report to Firestore
      await setDoc(doc(db, "reports", finalPlayerName), freshData);

      // 🔄 TRIGGER GLOBAL ANALYTICS UPDATE (both KPT and Summary)
      await updateTroopTypeKpt(isAdmin);

      setStructuredResults((prev = []) => {
        const updated = prev.filter(p => p.name !== finalPlayerName);
        return [{ name: finalPlayerName, data: freshData }, ...updated];
      });

      setStatus("✅ Match results saved & Global Analytics Updated.");
    } catch (err) {
      console.error("Matching failed", err);
      setStatus(
        err?.name === "OcrError"
          ? `❌ OCR failed: ${err.message}`
          : "❌ Error during image processing",
      );
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
      // Update individual report in Firestore
      await setDoc(doc(db, "reports", targetPlayerName), {
        ...updatedPlayer.data,
        archerKPT: updatedPlayer.archerKPT,
        archerLPT: updatedPlayer.archerLPT,
        cavalryKPT: updatedPlayer.cavalryKPT,
        cavalryLPT: updatedPlayer.cavalryLPT
      }, { merge: true });

      // 🔄 TRIGGER GLOBAL ANALYTICS UPDATE (both KPT and Summary)
      await updateTroopTypeKpt(isAdmin);
      
    } catch (err) {
      console.error("❌ Error updating Firestore:", err);
    }
  };

  const handleDelete = async (name) => {
    if (!isAdmin) {
      showNoPermission();
      return;
    }
    
    // Delete the individual report
    await deleteDoc(doc(db, "reports", name));
    
    // 🔄 TRIGGER GLOBAL ANALYTICS UPDATE (both KPT and Summary)
    await updateTroopTypeKpt(isAdmin);
    
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
          disabled={loading}
        >
          {loading ? <CircularProgress size={20} /> : "Upload & Scan"}
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary">{status}</Typography>
      <canvas ref={canvasRef} className="hidden-data" />

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
