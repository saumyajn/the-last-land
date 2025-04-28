import { Button, Box, CircularProgress, Paper, Snackbar } from "@mui/material";
import * as React from "react";

export default function ImageUpload({ image, onUpload, onExtract, loading, name }) {
    const fileInputRef = React.useRef();
    const [pasteSnackbarOpen, setPasteSnackbarOpen] = React.useState(false);

    React.useEffect(() => {
        const handlePaste = (event) => {
            const items = event.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (item.type.startsWith("image/")) {
                    const file = item.getAsFile();
                    if (file) {
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);

                        if (fileInputRef.current) {
                            fileInputRef.current.files = dataTransfer.files;
                        }

                        onUpload({ target: { files: dataTransfer.files } });
                        setPasteSnackbarOpen(true);
                    }
                }
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, [onUpload]);

    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <Box sx={{ mt: 2 }}>
            {/* Hidden file input */}
            <input
                type="file"
                accept="image/*"
                onChange={onUpload}
                ref={fileInputRef}
                disabled={!name.trim()}
                style={{ display: "none" }}
            />

            {/* Upload and Extract Buttons inline */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                <Button
                    variant="outlined"
                    onClick={handleUploadClick}
                    disabled={!name.trim()}
                >
                    Click or Paste Image
                </Button>

                <Button
                    variant="contained"
                    onClick={onExtract}
                    disabled={!image || loading}
                >
                    {loading ? <CircularProgress size={24} /> : "Extract Text"}
                </Button>
            </Box>

            {/* Image Preview */}
            {image && (
                <Paper elevation={3} sx={{ mt: 2, p: 1, borderRadius: 2, display: "inline-block" }}>
                    <img
                        src={image}
                        alt="Uploaded"
                        style={{
                            maxWidth: "300px",
                            maxHeight: "300px",
                            objectFit: "contain",
                            borderRadius: "8px",
                        }}
                    />
                </Paper>
            )}

            {/* Snackbar */}
            <Snackbar
                open={pasteSnackbarOpen}
                autoHideDuration={2000}
                onClose={() => setPasteSnackbarOpen(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                message="📥 Image pasted!"
                slotProps={{
                    root: {
                        sx: {
                            backgroundColor: "#333",
                            color: "#fff",
                            fontSize: "0.9rem",
                            borderRadius: "8px",
                            px: 2,
                            py: 1,
                        }
                    },
                }}
            />
        </Box>
    );
}
