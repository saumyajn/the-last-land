import React from "react";
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from "@mui/material";

export default function FormationTable({ colorNameMap = {}, groupedData = {} }) {
    console.log(colorNameMap)
    const rows = Object.entries(groupedData).map(([color, players]) => {
        const colorEntry = Object.entries(colorNameMap).find(([key]) => key === color);
        const groupName = colorEntry ? colorNameMap[color] : color;
        const totalDamage = players.reduce((sum, p) => sum + parseFloat(p.damage), 0);
        const avgDamage = players.length ? totalDamage / players.length : 0;
        return { group: groupName, damage: avgDamage };
    });

    return (
        <Box sx={{ mt: 4 }}>
            {/* <Typography variant="h6" gutterBottom>
                Grouped Final Archer Damage
            </Typography> */}
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell><b>Group</b></TableCell>
                            <TableCell><b>Av Archer Damage</b></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, idx) => (
                            <TableRow key={idx}>
                                <TableCell>{row.group}</TableCell>
                                <TableCell>{row.damage}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
