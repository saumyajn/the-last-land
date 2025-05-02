// src/pages/AboutPage.jsx
import React from "react";
import { Box, Paper, Typography } from "@mui/material";

export default function AboutPage() {
  return (
    <Box component={Paper} sx={{ mt: 3, p: 2 }}>
      <Typography variant="h5" gutterBottom>About This App</Typography>
      <Typography variant="body1">
        <b>The Last Land</b> is a custom-built analytics and stats dashboard designed to help strategy game players optimize performance.
        Users can track damage statistics, unit formations, and customize thresholds for performance tiers.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Built using <b>React</b>, <b>Google Vision Api</b>, <b>Firebase Auth</b>, and <b>Firestore</b> with role-based access and real-time updates.
      </Typography>
    </Box>
  );
}
