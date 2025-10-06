import { Box, Button, useTheme } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { updateCell } from "../../service/gridService";
import type { Grid, GridCell } from "../../types/grid";
import EditCell from "./EditCell";

interface SquaresGridProps {
  grid: Grid;
  onCellUpdate?: (cell: GridCell) => void;
}

export default function SquaresGrid({ grid, onCellUpdate }: SquaresGridProps) {
  const theme = useTheme();

  const numRows = grid.yLabels.length;
  const numCols = grid.xLabels.length;

  const buildGridArray = useCallback(() => {
    const arr: string[][] = Array.from({ length: numRows }, () => Array(numCols).fill(""));
    grid.cells.forEach(cell => {
      if (cell.row < numRows && cell.col < numCols) {
        arr[cell.row][cell.col] = cell.value;
      }
    });
    return arr;
  }, [grid, numRows, numCols]);

  const [localGrid, setLocalGrid] = useState<string[][]>(buildGridArray());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLocalGrid(buildGridArray());
  }, [buildGridArray, grid]);

  const handleCellClick = (row: number, col: number) => {
    setSelectedCell({ row, col });
    setTempValue(localGrid[row][col]);
    setError("");
    setModalOpen(true);
  };

	const handleSave = async () => {
		if (!selectedCell) return;

		const newValue = tempValue.slice(0, 3);
		const updatedCell = grid.cells.find(
			c => c.row === selectedCell.row && c.col === selectedCell.col
		);

		if (!updatedCell) return;

		setLoading(true);
		setError("");

		try {
			// Pass cell id and new value separately
			const cellFromServer = await updateCell(updatedCell, newValue);

			// Update local grid after success
			const newGrid = localGrid.map((row, r) =>
				row.map((cellData, c) =>
					r === selectedCell.row && c === selectedCell.col ? cellFromServer.value : cellData
				)
			);
			setLocalGrid(newGrid);
			onCellUpdate?.(cellFromServer);
			setModalOpen(false);
		} catch (err: unknown) {
			const apiError = err as { message?: string };
			setError(apiError.message || "Failed to update cell");
		} finally {
			setLoading(false);
		}
	};


  return (
    <>
      <Box sx={{ p: 2 }}>
        {/* Top row with x axis labels */}
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Box sx={{ marginLeft: { xs: 4.85, sm: 6.75, md: 8.5 } }} />
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

        {/* Rows with y axis + grid */}
        {localGrid.map((rowData, rowIndex) => (
          <Box
            key={rowIndex}
            sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
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

      <EditCell
        open={modalOpen}
        value={tempValue}
        onChange={setTempValue}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        loading={loading}
        errorMessage={error}
      />
    </>
  );
}
