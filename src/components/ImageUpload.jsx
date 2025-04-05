import { Button, Box, CircularProgress } from "@mui/material";
import * as React from "react";
export default function ImageUpload({ image, onUpload, onExtract, loading, name }) {
    return (
        <>
            <input type="file" accept="image/*" onChange={onUpload} 
            disabled= {!name.trim() } style={{ marginBottom: 16 }} />
            <Button
                variant="contained"
                onClick={onExtract}
                disabled={!image || loading}
                sx={{ ml: 2 }}
            >
                {loading ? <CircularProgress size={24} /> : "Extract Text"}
            </Button>
            {image && (
                <Box mt={2}>
                    <img src={image} alt="Uploaded" style={{ maxWidth: "20%", borderRadius: 8 }} />
                </Box>
            )}</>
    )
}