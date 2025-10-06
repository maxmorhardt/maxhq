import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from "@mui/material";
import type { Grid } from "../../types/grid";

interface GridsTableProps {
  grids: Grid[];
}

export default function GridsTable({ grids }: GridsTableProps) {
  return (
    <Box sx={{ p: 2 }}>
      {grids.map((grid) => (
        <Box key={grid.id} sx={{ mb: 5 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Grid: {grid.name} (ID: {grid.id})
          </Typography>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Cell ID</TableCell>
                  <TableCell>Row</TableCell>
                  <TableCell>Col</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell>Updated At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {grid.cells.map((cell) => (
                  <TableRow key={cell.id}>
                    <TableCell>{cell.id}</TableCell>
                    <TableCell>{cell.row}</TableCell>
                    <TableCell>{cell.col}</TableCell>
                    <TableCell>{cell.value}</TableCell>
                    <TableCell>{cell.owner}</TableCell>
                    <TableCell>{cell.createdAt}</TableCell>
                    <TableCell>{cell.updatedAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Grid metadata */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Grid Metadata:</Typography>
            <Typography>ID: {grid.id}</Typography>
            <Typography>Name: {grid.name}</Typography>
            <Typography>X Labels: {grid.xLabels.join(", ")}</Typography>
            <Typography>Y Labels: {grid.yLabels.join(", ")}</Typography>
            <Typography>Created By: {grid.createdBy}</Typography>
            <Typography>Updated By: {grid.updatedBy}</Typography>
            <Typography>Created At: {grid.createdAt}</Typography>
            <Typography>Updated At: {grid.updatedAt}</Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
