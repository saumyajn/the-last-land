
import { Box, Typography, Paper } from '@mui/material';
import * as React from 'react';
export default function RawText({text}) {
    return (
        <>
            {text && (
                <Box component={Paper} elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Raw Extracted Text
                    </Typography>
                    <Box component="pre" sx={{ whiteSpace: 'pre-wrap', backgroundColor: '#f3f3f3', p: 2, borderRadius: 2 }}>
                        {text}
                    </Box>
                </Box>
            )}
        </>
    )
}