import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Link as MuiLink,
} from "@mui/material";
import { Link } from "react-router-dom";
import type { Grid } from "../../types/grid";

interface GridsTableProps {
  grids: Grid[];
}

export default function GridsTable({ grids }: GridsTableProps) {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, textAlign: { xs: "center", sm: "left" } }}>
        Grids Overview
      </Typography>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>X Labels</TableCell>
              <TableCell>Y Labels</TableCell>
              <TableCell>Created By</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {grids.map((grid) => (
              <TableRow key={grid.id}>
                <TableCell>
                  <MuiLink component={Link} to={`/grids/${grid.id}`} underline="hover">
                    {grid.name}
                  </MuiLink>
                </TableCell>
                <TableCell>{grid.xLabels.join(", ")}</TableCell>
                <TableCell>{grid.yLabels.join(", ")}</TableCell>
                <TableCell>{grid.createdBy}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
