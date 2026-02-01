import { Button, Box, CircularProgress, Paper, Snackbar, IconButton } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import * as React from "react";

// REPLACE THIS with your actual Cloud Function URL from the terminal
const FUNCTION_URL = "https://extract-text-from-image-4cyoytiwnq-uc.a.run.app";

export default function ImageUpload({ onUpload, onExtract, name }) {
    const fileInputRef = React.useRef();
    const [pasteSnackbarOpen, setPasteSnackbarOpen] = React.useState(false);
    
    // We need two states: one for preview URLs (images) and one for actual File objects (files)
    const [images, setImages] = React.useState([]); 
    const [files, setFiles] = React.useState([]); 
    
    const [loading, setLoading] = React.useState(false);

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
    }); // Added dependency array to prevent double-binding

    const handleFiles = (fileList) => {
        const filesArray = Array.from(fileList);
        
        // 1. Create Preview URLs for UI
        const urls = filesArray.map(file => URL.createObjectURL(file));
        setImages(prev => [...prev, ...urls]);

        // 2. Store actual File objects for the API
        setFiles(prev => [...prev, ...filesArray]);

        // Optional: Still notify parent of raw upload if needed
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

    const deleteImage = (index) => {
        // Revoke URL to prevent memory leaks
        const url = images[index];
        if (url) URL.revokeObjectURL(url);

        // Remove from both arrays
        setImages(prev => prev.filter((_, i) => i !== index));
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleExtractClick = async () => {
        if (files.length === 0) return;

        setLoading(true);
        try {
            // Process all files concurrently
            const promises = files.map(file => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    
                    reader.onload = async () => {
                        try {
                            // Strip "data:image/png;base64," prefix
                            const base64String = reader.result.split(",")[1];
                            
                            const response = await fetch(FUNCTION_URL, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ image: base64String }),
                            });

                            const data = await response.json();
                            if (response.ok) {
                                resolve(data.text);
                            } else {
                                console.error("API Error:", data);
                                resolve(`Error: ${data.error || "Failed to extract"}`);
                            }
                        } catch (err) {
                            reject(err);
                        }
                    };
                    reader.onerror = (error) => reject(error);
                });
            });

            const extractedTexts = await Promise.all(promises);
            
            // Pass the extracted text back to the parent component
            if (onExtract) {
                onExtract(extractedTexts);
            }

        } catch (error) {
            console.error("Extraction failed", error);
            alert("Failed to connect to the server.");
        } finally {
            setLoading(false);
        }
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
                className="hidden-data"
                style={{ display: 'none' }} // Ensure it's hidden
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
                    onClick={handleExtractClick} // Changed from onExtract to local handler
                    disabled={!files.length || loading}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : "Extract Text"}
                </Button>
            </Box>

            {/* Image Previews */}
            {images.length > 0 && (
                <Paper elevation={3} sx={{ mt: 2, p: 1, borderRadius: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
                    {images.map((img, idx) => (
                        <div className="image-preview" key={idx} style={{ position: 'relative' }}>
                            <img
                                src={img}
                                alt={`Uploaded ${idx + 1}`}
                                className="preview-img"
                                style={{ maxHeight: 100, borderRadius: 4 }}
                            />
                            <IconButton
                                className="delete-button"
                                size="small"
                                onClick={() => deleteImage(idx)}
                                aria-label={`Delete image ${idx + 1}`}
                                sx={{ position: 'absolute', top: -10, right: -10, background: 'white' }}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </div>
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