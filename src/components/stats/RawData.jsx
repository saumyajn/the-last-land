
import { Box, Typography, Paper } from '@mui/material';
import * as React from 'react';

export default function RawText({ text, parsedAttributes = {}, desiredKeys = [] }) {
    const parsedLines = desiredKeys
        .filter((key) => parsedAttributes[key] !== undefined)
        .map((key) => `${key} = ${parsedAttributes[key]}`);

    return (
        <>
            {text && (
                <Box component={Paper} elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Raw Extracted Text
                    </Typography>
                    {parsedLines.length > 0 && (
                        <>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                                Parsed Values
                            </Typography>
                            <Box component="pre" sx={{ whiteSpace: 'pre-wrap', backgroundColor: '#eef6ff', p: 2, borderRadius: 2, mb: 2 }}>
                                {parsedLines.join("\n")}
                            </Box>
                        </>
                    )}
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                        OCR Text
                    </Typography>
                    <Box component="pre" sx={{ whiteSpace: 'pre-wrap', backgroundColor: '#f3f3f3', p: 2, borderRadius: 2 }}>
                        {text}
                    </Box>
                </Box>
            )}
        </>
    )
}
