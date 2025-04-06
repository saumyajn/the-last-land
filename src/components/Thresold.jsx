import React, { useState } from 'react';
import {

    Typography,

    TextField,
    Grid,
    Stack,
    Input
} from "@mui/material";

const externalThresholds = [
    { limit: 600, color: "#805637" },
    { limit: 800, color: "#802480" },
    { limit: 1000, color: "#4545f5" },
    { limit: 1200, color: "#69f5f5" },
    { limit: 1400, color: "#357a35" },
    { limit: 1600, color: "#fcfc60" },
    { limit: 1800, color: "#fabf52" },
    { limit: 2000, color: "#ff3d3d" }
];
export const getColorByThreshold = (value) => {
    const sorted = [...externalThresholds].sort((a, b) => b.limit - a.limit);
    for (const threshold of sorted) {
        if (value >= threshold.limit) return threshold.color;
    }
    return "inherit";
};

export default function Thresold() {

    const [thresholds, setThresholds] = useState(externalThresholds);

    const handleThresholdChange = (index, field, value) => {
        const newThresholds = [...thresholds];
        newThresholds[index] = {
            ...newThresholds[index],
            [field]: field === "limit" ? parseFloat(value) || 0 : value,
        };
        setThresholds(newThresholds);
    };
    return (
        <>
            <Typography variant="h6" gutterBottom textAlign="center">
                Threshold Settings
            </Typography>

            <Grid container spacing={2} justifyContent="center" sx={{ mb: 3 }}>
                {thresholds.map((thresh, idx) => (
                    <Grid item xs={6} sm={4} md={2} key={idx}>
                        <Stack spacing={1} alignItems="center">
                            <TextField
                                label={`Limit ${idx + 1}`}
                                value={thresh.limit}
                                onChange={(e) => handleThresholdChange(idx, "limit", e.target.value)}
                                size="small"
                                type="number"
                                fullWidth
                            />
                            <Input
                                type="color"
                                value={thresh.color}
                                onChange={(e) => handleThresholdChange(idx, "color", e.target.value)}
                                sx={{ width: "100%", height: 40, borderRadius: 1, border: '1px solid #ccc' }}
                            />
                        </Stack>
                    </Grid>
                ))}
            </Grid></>
    )
}