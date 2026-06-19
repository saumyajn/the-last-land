import { useState } from 'react';
import { Button, CircularProgress, Alert, Box } from '@mui/material';
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzJHdTikXXDtiI0zAgYicFi4Rv9i4MGf6ZyXXjSV8c0XM1lnEglh55N-GdB8F2QdRTF/exec";

export default function ExportToGoogleSheet() {
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState(null);

  const handleExport = async () => {
    setExporting(true);
    setStatus(null);

    try {
      const [troopSnap, archerSnap, cavalrySnap] = await Promise.all([
        getDoc(doc(db, "analytics", "troop_type_summary")),
        getDoc(doc(db, "analytics", "archer_final")),
        getDoc(doc(db, "analytics", "cavalry_final"))
      ]);

      const payload = {
        troop_summary: troopSnap.exists() ? troopSnap.data() : {},
        archer_final: archerSnap.exists() ? archerSnap.data() : {},
        cavalry_final: cavalrySnap.exists() ? cavalrySnap.data() : {}
      };

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
