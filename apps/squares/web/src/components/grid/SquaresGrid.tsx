import { Box, Button, useTheme } from "@mui/material";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { setCurrentCell } from "../../features/grids/gridThunks";
import EditCell from "./EditCell";
import { selectCurrentGrid } from "../../features/grids/gridSelectors";

export default function SquaresGrid() {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const grid = useAppSelector(selectCurrentGrid);

  const [open, setOpen] = useState(false);

  if (!grid) {
    return;
  }

  const numRows = grid.yLabels.length;
  const numCols = grid.xLabels.length;

  const gridMatrix: string[][] = Array.from({ length: numRows }, () => Array(numCols).fill(""));
  grid.cells.forEach((cell) => {
    if (cell.row < numRows && cell.col < numCols) {
      gridMatrix[cell.row][cell.col] = cell.value;
    }
  });

  const handleCellClick = async (row: number, col: number) => {
    const cell = grid.cells.find((c) => c.row === row && c.col === col);

    if (!cell) {
      return;
    }

    await dispatch(setCurrentCell(cell));
    setOpen(true);
  };

  return (
    <>
      <Box>
        {/* x-axis */}
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          {/* empty box to align labels */}
          <Box sx={{ marginRight: { xs: 1.5, sm: 1.5, md: 1.75 } }} />
          {/* labels */}
          {grid.xLabels.map((label, i) => (
            <Box
              key={i}
              sx={{
                fontWeight: "bold",
                fontSize: { xs: 10, sm: 12, md: 14 },
                margin: { xs: 0.1, sm: 0.3, md: 0.3 },
                minWidth: { xs: 30, sm: 45, md: 60 },
              }}
            >
              {label === -1 ? "-" : label}
            </Box>
          ))}
        </Box>

        {/* y-axis */}
        {gridMatrix.map((rowData, rowIndex) => (
          <Box
            key={rowIndex}
            sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {/* labels */}
            <Box
              sx={{
                mr: 1,
                textAlign: "center",
                fontWeight: "bold",
                fontSize: { xs: 10, sm: 12, md: 14 },
              }}
            >
              {grid.yLabels[rowIndex] === -1 ? "-" : grid.yLabels[rowIndex]}
            </Box>

            {/* cell data */}
            {rowData.map((cellData, colIndex) => (
              <Button
                key={`${rowIndex}-${colIndex}`}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                sx={{
                  bgcolor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  padding: 0,
                  margin: { xs: 0.1, sm: 0.3, md: 0.3 },
                  minWidth: { xs: 30, sm: 45, md: 60 },
                  minHeight: { xs: 30, sm: 45, md: 60 },
                  fontSize: { xs: 10, sm: 12, md: 14 },
                }}
              >
                {cellData}
              </Button>
            ))}
          </Box>
        ))}
      </Box>

      <EditCell open={open} onClose={() => setOpen(false)} />
    </>
  );
}
