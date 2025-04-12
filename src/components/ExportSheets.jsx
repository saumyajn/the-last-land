import React, { useState } from "react";
import { Button, Typography, Box, CircularProgress, Stack } from "@mui/material";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../utils/firebase";

export default function ExportToGoogleSheet() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const sheetsURL =
    "https://script.google.com/macros/s/AKfycbx27TDrvZBhf6dW3QtbHSrqOTXkclGQas99REh_uWav4Q1PnnrkiKTsdMAWr-84QWD6LA/exec";

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
