import { useEffect } from "react";
import { Paper, Grid, TextField, Button, Stack, Divider } from "@mui/material";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";

import { usePermissionSnackbar } from "../Permissions";

export default function FormationForm({ label, formState, setFormState, isAdmin }) {
  const docName = (label.toLowerCase().includes("throne") ? "throne_formation" : "tower_formation")


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
       const payload = {
        ...formState,
        damage_troops: calcDamage(formState.total, formState.guards),
      };
      await setDoc(doc(db, "settings", docName), payload);
      console.log("Saved", docName);
    } catch (error) {
      console.error("Error saving formation:", error);
    }
  };

  const calcDamage = (tot, gua) =>
    String((Number(tot) || 0) - (Number(gua) || 0));

  const handleChange = key => e => {
    const val = e.target.value;
    setFormState(prev => {
      const next = { ...prev, [key]: val };
      if (key === "total" || key === "guards") {
        next.damage_troops = calcDamage(next.total, next.guards);
      }
      return next;
    });
  };
  return (
    <Paper elevation={2} sx={{
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
            onChange={handleChange("total")}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            label="Guards"
            value={formState.guards}
            onChange={handleChange("guards")}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            label="Damage Troops"
            value={formState.damage_troops}
            inputProps={{ readOnly: true }}
          onFocus={(e) => e.target.select()}

          />
          {console.log(String((Number(formState.total) || 0) - (Number(formState.guards) || 0)))}
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
        <Button variant="contained" size="small" onClick={handleSave}>Save</Button>
      </Stack>
    </Paper>
  );
}
