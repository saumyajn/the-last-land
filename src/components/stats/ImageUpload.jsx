import { Button, Box, CircularProgress, Paper, Snackbar, IconButton } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import * as React from "react";
import { detectTextWithWords, fileToBase64 } from "../../utils/googleVisions";

export default function ImageUpload({ onUpload, onExtract, name, loading: parentLoading  }) {
    const fileInputRef = React.useRef();
    const [pasteSnackbarOpen, setPasteSnackbarOpen] = React.useState(false);

    // We need two states: one for preview URLs (images) and one for actual File objects (files)
    const [images, setImages] = React.useState([]);
    const [files, setFiles] = React.useState([]);
    const imagesRef = React.useRef([]);

    const [loading, setLoading] = React.useState(false);

    const clearFiles = React.useCallback(() => {
        imagesRef.current.forEach((url) => URL.revokeObjectURL(url));
        imagesRef.current = [];
        setImages([]);
        setFiles([]);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, []);

    const handleFiles = React.useCallback((fileList) => {
        const filesArray = Array.from(fileList);
        if (!filesArray.length) return;

        const urls = filesArray.map(file => URL.createObjectURL(file));
        setImages(prev => [...prev, ...urls]);
        setFiles(prev => [...prev, ...filesArray]);

        if (onUpload) {
            onUpload({ target: { files: fileList } });
        }
    }, [onUpload]);

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
    }, [handleFiles]);

    React.useEffect(() => {
        imagesRef.current = images;
    }, [images]);

    React.useEffect(() => {
        return () => {
            imagesRef.current.forEach((url) => URL.revokeObjectURL(url));
        };
    }, []);

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
        if (files.length === 0 || !name.trim()) return;

        setLoading(true);
        try {
            const extractedResults = await Promise.all(
                files.map(async (file) => {
                    const base64String = await fileToBase64(file);
                    return detectTextWithWords(base64String);
                })
            );

            // Pass the extracted text back to the parent component
            if (onExtract) {
                await onExtract(extractedResults);
            }
            clearFiles();

        } catch (error) {
            console.error("Extraction failed", error);
            alert("Failed to extract text from the uploaded image.");
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
                    disabled={!files.length || loading || parentLoading || !name.trim()}
                >
                    {loading || parentLoading? <CircularProgress size={24} color="inherit" /> : "Extract Text"}
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
