import { useState } from 'react';
import { Button, CircularProgress, Alert, Box } from '@mui/material';
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

// IMPORTANT: Replace with your deployed Web App URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw9etaqBQMnTXlgBKVCHdfOcrRwW_M5vcg7dE0VVxtRB7ael5M6gpFmy1WULZ5zxlet/exec";

export default function ExportToGoogleSheet() {
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState(null);

  const handleExport = async () => {
    setExporting(true);
    setStatus(null);

    try {
      // 1. Fetch all documents from Firestore
      const [troopSnap, archerSnap, cavalrySnap] = await Promise.all([
        getDoc(doc(db, "analytics", "troop_type_summary")),
        getDoc(doc(db, "analytics", "archer_final")),
        getDoc(doc(db, "analytics", "cavalry_final"))
      ]);

      // 2. Build the payload
      const payload = {
        troop_summary: troopSnap.exists() ? troopSnap.data() : {},
        archer_final: archerSnap.exists() ? archerSnap.data() : {},
        cavalry_final: cavalrySnap.exists() ? cavalrySnap.data() : {}
      };

      // 3. Post to Google Apps Script
       await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors", // Standard for Apps Script redirects
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      setStatus({ type: 'success', msg: "Export complete! New report sheet created." });
    } catch (err) {
      console.error("Export Error:", err);
      setStatus({ type: 'error', msg: "Export failed. Check console for details." });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Button
        variant="contained"
        color="success"
        size="small"
        startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <CloudUploadIcon />}
        onClick={handleExport}
        disabled={exporting}
        sx={{ textTransform: 'none', fontWeight: 'bold' }}
      >
        {exporting ? "Processing..." : "Export Full Report to Sheets"}
      </Button>
      {status && (
        <Alert severity={status.type} sx={{ mt: 1, py: 0 }}>
          {status.msg}
        </Alert>
      )}
    </Box>
  );
}

/**
 function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Generate a unique sheet name with timestamp
    var timeZone = Session.getScriptTimeZone();
    var sheetName = "Report " + Utilities.formatDate(new Date(), timeZone, "MM-dd HH:mm");
    var sheet = ss.insertSheet(sheetName);

    // --- SECTION A: TROOP TYPE SUMMARY TABLE ---
    var troopData = data.troop_summary || {};
    var troopDetails = troopData.troopDetails || {};
    var troopOrder = [
      "T10_guards", "T10_cavalry", "T10_archer", "T10_siege",
      "T9_cavalry", "T9_archer", "T8_cavalry", "T8_archer",
      "T8_siege", "T7_cavalry", "T7_archer"
    ];

    sheet.appendRow(["TROOP TYPE KPT SUMMARY"]);
    var troopHeaders = ["Troop Type", "Kills", "Losses", "Wounded", "Survivors", "KPT", "March Size", "% of March"];
    sheet.appendRow(troopHeaders);

    troopOrder.forEach(function(type) {
      var s = troopDetails[type] || {};
      sheet.appendRow([
        type,
        s.Kills || 0,
        s.Losses || 0,
        s.Wounded || 0,
        s.Survivors || 0,
        s.KPT || "0.00",
        s.calculatedMarchSize || 0,
        s.marchPercentage || "0.00%"
      ]);
    });

    // Add Totals row for Troop Table
    var t = troopData.totals || {};
    sheet.appendRow(["TOTAL", t.Kills, t.Losses, t.Wounded, t.Survivors, t.KPT, t.totalMarchSize, "100.00%"]);
    
    // Style Troop Table
    sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#cfe2f3");
    sheet.getRange(2, 1, 1, 8).setFontWeight("bold");
    sheet.getRange(sheet.getLastRow(), 1, 1, 8).setFontWeight("bold").setBackground("#eeeeee");

    // Add spacing rows
    sheet.appendRow([""]);
    sheet.appendRow([""]);

    // --- SECTION B: PLAYER FINAL STATS (Archer & Cavalry Side-by-Side) ---
    var archerData = data.archer_final || {};
    var cavalryData = data.cavalry_final || {};
    var archerPlayers = Object.keys(archerData).filter(function(p) { return p !== "id"; });
    var cavalryPlayers = Object.keys(cavalryData).filter(function(p) { return p !== "id"; });

    var playerStartRow = sheet.getLastRow() + 2;
    sheet.appendRow(["ARCHER FINAL", "", "", "", "", "", "", "CAVALRY FINAL"]);
    sheet.appendRow(["Player Name", "Kills", "Damage", "Troops", "KPT", "", "", "Player Name", "Kills", "Damage", "Troops", "KPT"]);

    var maxRows = Math.max(archerPlayers.length, cavalryPlayers.length);
    for (var i = 0; i < maxRows; i++) {
      var row = [];
      // Archer Data
      if (i < archerPlayers.length) {
        var aP = archerPlayers[i];
        var aS = archerData[aP];
        row.push(aP, aS.kills || 0, aS.damage || 0, aS.troops || 0, aS.kpt || "0");
      } else {
        row.push("", "", "", "", "");
      }
      // Gap
      row.push("", "");
      // Cavalry Data
      if (i < cavalryPlayers.length) {
        var cP = cavalryPlayers[i];
        var cS = cavalryData[cP];
        row.push(cP, cS.kills || 0, cS.damage || 0, cS.troops || 0, cS.kpt || "0");
      } else {
        row.push("", "", "", "", "");
      }
      sheet.appendRow(row);
    }

    // Style Player Tables
    sheet.getRange(playerStartRow, 1, 2, 12).setFontWeight("bold");

    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
} */