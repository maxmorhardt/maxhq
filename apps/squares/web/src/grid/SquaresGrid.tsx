import { Box, Button, Dialog, DialogContent, DialogTitle, TextField, useTheme } from "@mui/material";
import { useState } from "react";

function SquaresGrid() {
  const theme = useTheme();
  const [grid, setGrid] = useState<string[][]>(
    Array.from({ length: 10 }, () => Array(10).fill(""))
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [tempValue, setTempValue] = useState("");

  const handleCellClick = (row: number, col: number) => {
    setSelectedCell({ row, col });
    setTempValue(grid[row][col]);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (selectedCell) {
      const newGrid = [...grid];
      newGrid[selectedCell.row][selectedCell.col] = tempValue.slice(0, 3);
      setGrid(newGrid);
    }

    setModalOpen(false);
  };

  const xLabels = Array.from({ length: 10 }, () => "-");
	const yLabels = Array.from({ length: 10 }, () => "-");

  return (
    <>
      <Box sx={{ p: 2 }}>
        {/* Top row with X-axis labels */}
        <Box sx={{ display: "flex", justifyContent: "center" }}>
					{/* Empty box for top left */}
					<Box sx={{ marginLeft: { xs: 4.85, sm: 6.75, md: 8.5 } }}/>
          {xLabels.map((label) => (
            <Box
              key={label}
              sx={{
                fontWeight: "bold",
                fontSize: { xs: 10, sm: 12, md: 14 },
								margin: { xs: 0.1, sm: 0.3, md: 0.3 },
								minWidth: { xs: 30, sm: 45, md: 60 },
              }}
            >
              {label}
            </Box>
          ))}
        </Box>

        {/* Rows with Y-axis + grid */}
        {grid.map((rowData, rowIndex) => (
          <Box
            key={rowIndex}
            sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {/* Y-axis label */}
            <Box
              sx={{
                mr: 1,
                textAlign: "center",
                fontWeight: "bold",
                fontSize: { xs: 10, sm: 12, md: 14 },
              }}
            >
              {yLabels[rowIndex]}
            </Box>

            {/* Row of cells */}
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

      {/* Edit modal */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
        <DialogTitle>Edit Cell</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            value={tempValue}
            onChange={(e) => {
              const raw = e.target.value.toUpperCase();
              const filtered = raw.replace(/[^A-Z0-9]/g, "");
              setTempValue(filtered.slice(0, 3));
            }}
            slotProps={{
              input: {
                inputProps: { maxLength: 3 },
                style: { textAlign: "center" },
              },
            }}
            fullWidth
          />
          <Box mt={2} display="flex" justifyContent="flex-end" gap={1}>
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSave}>
              Save
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SquaresGrid;
