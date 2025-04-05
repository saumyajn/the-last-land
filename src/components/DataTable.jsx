import React from "react";
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper
} from "@mui/material";

export default function DataTable({ tableData = {}, desiredKeys = [] }) {
    const names = Object.keys(tableData);

    if (!names.length) return null;
    return (
        <Box component={Paper} elevation={3} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
                Parsed Stats Table
            </Typography>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell><b>Name</b></TableCell>
                            {desiredKeys.map((key, idx) => (
                                <TableCell key={idx}><b>{key}</b></TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {names.map((name, idx) => (
                            <TableRow key={idx}>
                                <TableCell>{name}</TableCell>
                                {desiredKeys.map((key, kdx) => (
                                    <TableCell key={kdx}>{tableData[name]?.[key] || "NA"}</TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
