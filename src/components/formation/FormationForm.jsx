import { useEffect } from "react";
import { Paper, Grid, TextField, Button, Stack, Divider } from "@mui/material";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";

import { usePermissionSnackbar } from "../Permissions";

export default function FormationForm({ label, formState, setFormState , isAdmin , type }) {
  const docName = type === "archer"
    ? (label.toLowerCase().includes("throne") ? "throne_formation" : "tower_formation")
    : (label.toLowerCase().includes("throne") ? "cavalry_throne_formation" : "cavalry_tower_formation");

  const { showNoPermission } = usePermissionSnackbar();
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
      if (!isAdmin) {
        showNoPermission();
        return;
      }
      await setDoc(doc(db, "settings", docName), formState);
      console.log("Saved", docName);
    } catch (error) {
      console.error("Error saving formation:", error);
    }
  };

  return (
    <Paper  elevation={2}  sx={{
        p: 3,
        mb: 3,
        borderRadius: 3,
        backgroundColor: "#fdfdfd",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
     
      <Grid container spacing={2} sx={{ justifyContent: 'space-around' }}>
        <Grid item xs={12} sm={3}>
          <TextField
            label="Total Troops"
            value={formState.total}
            onChange={(e) => setFormState({ ...formState, total: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            label="Guards"
            value={formState.guards}
            onChange={(e) => setFormState({ ...formState, guards: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            label="Archers"
            value={formState.archers}
            onChange={(e) => setFormState({ ...formState, archers: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            label="Cavalry"
            value={formState.cavalry}
            onChange={(e) => setFormState({ ...formState, cavalry: e.target.value })}
            fullWidth
          />
        </Grid>
      </Grid>
      <Divider sx={{ m: 2 }} />
      <Grid container spacing={2} sx={{ justifyContent: 'space-around' }}>
        <Grid item xs={12} sm={3}>
          <TextField
            label="T10 Archers"
            value={formState.at10}
            onChange={(e) => setFormState({ ...formState, at10: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            label="T9 Archers"
            value={formState.at9}
            onChange={(e) => setFormState({ ...formState, at9: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            label="T8 Archers"
            value={formState.at8}
            onChange={(e) => setFormState({ ...formState, at8: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            label="T7 Archers"
            value={formState.at7}
            onChange={(e) => setFormState({ ...formState, at7: e.target.value })}
            fullWidth
          />
        </Grid>
      
      </Grid>
      <Divider sx={{ m: 2 }} />
       <Grid container spacing={2} sx={{ justifyContent: 'space-around' }}>
        <Grid item xs={12} sm={3}>
          <TextField
            label="T10 Cavalry"
            value={formState.ct10}
            onChange={(e) => setFormState({ ...formState, ct10: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            label="T9 Cavalry"
            value={formState.ct9}
            onChange={(e) => setFormState({ ...formState, ct9: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            label="T8 Cavalry"
            value={formState.ct8}
            onChange={(e) => setFormState({ ...formState, ct8: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            label="T7 Cavalry"
            value={formState.ct7}
            onChange={(e) => setFormState({ ...formState, ct7: e.target.value })}
            fullWidth
          />
        </Grid>
      </Grid>
      <Stack direction="row" justifyContent="flex-end" mt={2}>
        <Button variant="contained" size="small"onClick={handleSave}>Save</Button>
      </Stack>
    </Paper>
  );
}
