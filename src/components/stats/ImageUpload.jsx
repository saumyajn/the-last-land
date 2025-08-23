import { Button, Box, CircularProgress, Paper, Snackbar } from "@mui/material";
import * as React from "react";

export default function ImageUpload({ image, onUpload, onExtract, loading, name }) {
    const fileInputRef = React.useRef();
    const [pasteSnackbarOpen, setPasteSnackbarOpen] = React.useState(false);
    const [images, setImages] = React.useState([]);

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

                        handleFiles(dataTransfer.files);
                        setPasteSnackbarOpen(true);
                    }
                }
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, []);

    const handleFiles = (fileList) => {
        const filesArray = Array.from(fileList);
        const urls = filesArray.map(file => URL.createObjectURL(file));
        setImages(prev => [...prev, ...urls]);
        // Call the parent onUpload with all files
        if (onUpload) {
            onUpload({ target: { files: fileList } });
        }
    };

    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleInputChange = (e) => {
        handleFiles(e.target.files);
    };

    return (
        <Box sx={{ mt: 2 }}>
            {/* Hidden file input */}
            <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleInputChange}
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
                    Click or Paste Image(s)
                </Button>

                <Button
                    variant="contained"
                    onClick={onExtract}
                    disabled={!images.length || loading}
                >
                    {loading ? <CircularProgress size={24} /> : "Extract Text"}
                </Button>
            </Box>

            {/* Image Previews */}
            {images.length > 0 && (
                <Paper elevation={3} sx={{ mt: 2, p: 1, borderRadius: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
                    {images.map((img, idx) => (
                        <img
                            key={idx}
                            src={img}
                            alt={`Uploaded ${idx + 1}`}
                            style={{
                                maxWidth: "120px",
                                maxHeight: "120px",
                                objectFit: "contain",
                                borderRadius: "8px",
                            }}
                        />
                    ))}
                </Paper>
            )}

            {/* Snackbar */}
            <Snackbar
                open={pasteSnackbarOpen}
                autoHideDuration={2000}
                onClose={() => setPasteSnackbarOpen(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                message="📥 Image(s) pasted!"
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