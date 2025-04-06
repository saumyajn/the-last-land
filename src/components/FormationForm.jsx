import React, { useEffect } from "react";
import { Paper, Typography, Grid, TextField, Button, Stack, Divider } from "@mui/material";
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
    <Paper sx={{ p: 1, mb: 1 }}>
      <Typography variant="h6" gutterBottom>{label}</Typography>
      <Grid container spacing={2} sx={{justifyContent:'space-around'}}>
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
      <Divider sx={{ m: 2 }} />
      <Grid container spacing={2} sx={{justifyContent:'space-around'}}>
        <Grid size={2}>
          <TextField
            label="T10"
            value={formState.t10}
            onChange={(e) => setFormState({ ...formState, t10: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid size={2}>
          <TextField
            label="T9"
            value={formState.t9}
            onChange={(e) => setFormState({ ...formState, t9: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid size={2}>
          <TextField
            label="T8"
            value={formState.t8}
            onChange={(e) => setFormState({ ...formState, t8: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid size={2}>
          <TextField
            label="T7"
            value={formState.t7}
            onChange={(e) => setFormState({ ...formState, t7: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid size={2}>
          <TextField
            label="T6"
            value={formState.t6}
            onChange={(e) => setFormState({ ...formState, t6: e.target.value })}
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
