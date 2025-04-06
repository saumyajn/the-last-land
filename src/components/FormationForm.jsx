import React, { useEffect } from "react";
import { Paper, Typography, Grid, TextField, Button, Stack } from "@mui/material";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";

export default function FormationForm({ label, formState, setFormState }) {
  const docName = label.toLowerCase().includes("throne") ? "throne_formation" : "tower_formation";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docRef = doc(db, "settings", docName);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFormState(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching formation data:", error);
      }
    };
    fetchData();
  }, [docName, setFormState]);

  const handleSave = async () => {
    try {
      await setDoc(doc(db, "settings", docName), formState);
      console.log("Saved", docName);
    } catch (error) {
      console.error("Error saving formation:", error);
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>{label}</Typography>
      <Grid container spacing={2}>
        <Grid xs={6} md={3}>
          <TextField
            label="Total Troops"
            value={formState.total}
            onChange={(e) => setFormState({ ...formState, total: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid xs={6} md={3}>
          <TextField
            label="Guards"
            value={formState.guards}
            onChange={(e) => setFormState({ ...formState, guards: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid xs={6} md={3}>
          <TextField
            label="Archers"
            value={formState.archers}
            onChange={(e) => setFormState({ ...formState, archers: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid xs={6} md={3}>
          <TextField
            label="Cavalry"
            value={formState.cavalry}
            onChange={(e) => setFormState({ ...formState, cavalry: e.target.value })}
            fullWidth
          />
        </Grid>
      </Grid>
      <Stack direction="row" justifyContent="flex-end" mt={2}>
        <Button variant="contained" onClick={handleSave}>Save</Button>
      </Stack>
    </Paper>
  );
}
