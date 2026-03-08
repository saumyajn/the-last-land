import { useState } from "react";
import { Button, Typography, Box, CircularProgress, Stack } from "@mui/material";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../utils/firebase";

export default function ExportToGoogleSheet() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const sheetsURL =
    "https://script.google.com/macros/s/AKfycbz0sIJpeOESF6yAc9wDeL_vLOz9Zb4OwJOM9jxW2Bda40pdb4v053F787zcBH4NQoI/exec";

  const exportData = async () => {
    setLoading(true);
    setStatus("");
    try {
      const snapshot = await getDocs(collection(db, "analytics"));

      const filteredDocs = snapshot.docs.filter(doc =>
        ["archer_final", "cavalry_final"].includes(doc.id)
      );

      const dataToSend = {};
      filteredDocs.forEach(doc => {
        dataToSend[doc.id] = {
          id: doc.id,
          ...doc.data(),
        };
      });

      console.log("Exporting data:", dataToSend);
      await fetch(sheetsURL, {
        method: "POST",
        mode: "no-cors", // No visible response due to Apps Script CORS limitation
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      setStatus("✅ Export triggered! Check your Google Sheet.");
    } catch (err) {
      console.error("Export failed:", err);
      setStatus("❌ Export failed. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Stack spacing={2} direction="column" alignItems="flex-start">
        <Button
          variant="contained"
          onClick={exportData}
          disabled={loading}
          color="secondary"
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "Export to Google Sheet"}
        </Button>
        {status && (
          <Typography variant="body2" color={status.startsWith("✅") ? "green" : "error"}>
            {status}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}


/**
 * function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Generate the Sheet Name (e.g., "03-07-2026 23:40")
    var timeZone = Session.getScriptTimeZone();
    var sheetName = Utilities.formatDate(new Date(), timeZone, "MM-dd HH:mm");
    var sheet = ss.insertSheet(sheetName);

    // 2. Extract Data
    var archerData = data["archer_final"] || {};
    var cavalryData = data["cavalry_final"] || {};

    // Get arrays of player names (ignoring "id" if it exists)
    var archerPlayers = Object.keys(archerData).filter(function(p) { return p !== "id"; });
    var cavalryPlayers = Object.keys(cavalryData).filter(function(p) { return p !== "id"; });

    // 3. Build and append the Title row (Row 1)
    // Archer starts in Col 1, Cavalry starts in Col 8 (after 5 cols of Archer + 2 gap cols)
    var titleRow = ["ARCHER FINAL", "", "", "", "", "", "", "CAVALRY FINAL"];
    sheet.appendRow(titleRow);

    // 4. Build and append the Header row (Row 2)
    var headers = ["Player Name", "Kills", "Damage", "Troops", "KPT"];
    var gap = ["", ""]; // 2-column gap
    var headerRow = headers.concat(gap).concat(headers);
    sheet.appendRow(headerRow);

    // Format headers to be bold for easy reading
    sheet.getRange("A1:L2").setFontWeight("bold");

    // 5. Figure out which table has more players so we know how many rows to make
    var maxRows = Math.max(archerPlayers.length, cavalryPlayers.length);

    // 6. Loop through and build the data rows side-by-side
    for (var i = 0; i < maxRows; i++) {
      var row = [];

      // --- ARCHER COLUMNS (A through E) ---
      if (i < archerPlayers.length) {
        var aName = archerPlayers[i];
        var aStats = archerData[aName];
        row.push(aName);
        row.push(aStats.kills !== undefined ? aStats.kills : 0);
        row.push(aStats.damage !== undefined ? aStats.damage : 0);
        row.push(aStats.troops !== undefined ? aStats.troops : 0);
        row.push(aStats.kpt !== undefined ? aStats.kpt : "0");
      } else {
        // If Archer runs out of players before Cavalry, push 5 empty cells
        row.push("", "", "", "", ""); 
      }

      // --- THE 2-COLUMN GAP (F and G) ---
      row.push("", "");

      // --- CAVALRY COLUMNS (H through L) ---
      if (i < cavalryPlayers.length) {
        var cName = cavalryPlayers[i];
        var cStats = cavalryData[cName];
        row.push(cName);
        row.push(cStats.kills !== undefined ? cStats.kills : 0);
        row.push(cStats.damage !== undefined ? cStats.damage : 0);
        row.push(cStats.troops !== undefined ? cStats.troops : 0);
        row.push(cStats.kpt !== undefined ? cStats.kpt : "0");
      } else {
        // If Cavalry runs out of players before Archer, push 5 empty cells
        row.push("", "", "", "", ""); 
      }

      // Append the beautifully constructed wide row to the sheet
      sheet.appendRow(row);
    }

    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}
 */