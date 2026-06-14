import { useEffect } from "react";
import { Paper, Grid, TextField, Button, Stack, Divider, Box, Typography } from "@mui/material";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";

import { usePermissionSnackbar } from "../Permissions";

export default function FormationForm({ label, formState, setFormState, isAdmin, onSaved }) {
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
      setFormState(payload);
      onSaved?.(payload);
      if (process.env.NODE_ENV === "development") {
        console.log("Saved", docName);
      }
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

  const getPercentValue = (key) => Number(formState[key]) || 0;
  const archerPercentTotal = getPercentValue("at10") + getPercentValue("at9") + getPercentValue("at8") + getPercentValue("at7");
  const cavalryPercentTotal = getPercentValue("ct10") + getPercentValue("ct9") + getPercentValue("ct8") + getPercentValue("ct7");
  const formationPercentTotal = archerPercentTotal + cavalryPercentTotal;
  const isFormationTotalValid = Math.abs(formationPercentTotal - 100) < 0.001;

  return (
    <Paper elevation={0} sx={{
      p: { xs: 1.5, md: 2 },
      mb: 3,
      borderRadius: 2,
      backgroundColor: "#f8fafc",
      border: "1px solid rgba(15,23,42,0.08)",
    }}
    >

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Total Troops"
            value={formState.total}
            onChange={handleChange("total")}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Guards"
            value={formState.guards}
            onChange={handleChange("guards")}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Damage Troops"
            value={formState.damage_troops}
            inputProps={{ readOnly: true }}
          onFocus={(e) => e.target.select()}

          />
        </Grid>


      </Grid>
      <Divider sx={{ my: 2 }} />
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <TextField
            label="T10 Archers"
            value={formState.at10}
            onChange={(e) => setFormState({ ...formState, at10: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField
            label="T9 Archers"
            value={formState.at9}
            onChange={(e) => setFormState({ ...formState, at9: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField
            label="T8 Archers"
            value={formState.at8}
            onChange={(e) => setFormState({ ...formState, at8: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField
            label="T7 Archers"
            value={formState.at7}
            onChange={(e) => setFormState({ ...formState, at7: e.target.value })}
            fullWidth
          />
        </Grid>

      </Grid>
      <Divider sx={{ my: 2 }} />
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <TextField
            label="T10 Cavalry"
            value={formState.ct10}
            onChange={(e) => setFormState({ ...formState, ct10: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField
            label="T9 Cavalry"
            value={formState.ct9}
            onChange={(e) => setFormState({ ...formState, ct9: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField
            label="T8 Cavalry"
            value={formState.ct8}
            onChange={(e) => setFormState({ ...formState, ct8: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField
            label="T7 Cavalry"
            value={formState.ct7}
            onChange={(e) => setFormState({ ...formState, ct7: e.target.value })}
            fullWidth
          />
        </Grid>
      </Grid>
      <Box
        sx={{
          mt: 2,
          p: 1.25,
          borderRadius: 2,
          border: "1px solid",
          borderColor: isFormationTotalValid ? "rgba(22,163,74,0.28)" : "rgba(220,38,38,0.28)",
          backgroundColor: isFormationTotalValid ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Typography variant="body2" sx={{ fontWeight: 800, color: "text.primary" }}>
            Total: {formationPercentTotal.toFixed(1)}%
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
            Archers {archerPercentTotal.toFixed(1)}% + Cavalry {cavalryPercentTotal.toFixed(1)}% = 100%
          </Typography>
        </Stack>
      </Box>
      <Stack direction="row" justifyContent="flex-end" mt={2}>
        <Button variant="contained" size="small" onClick={handleSave}>Save</Button>
      </Stack>
    </Paper>
  );
}
