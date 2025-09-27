import { Box, Grid, TextField } from "@mui/material";
import { useState } from "react";

function SquaresGrid() {
  // 10x10 grid initialized with empty strings
  const [grid, setGrid] = useState<string[][]>(
    Array.from({ length: 10 }, () => Array(10).fill(""))
  );

  const handleChange = (row: number, col: number, value: string) => {
    if (value.length <= 3) { // limit to 3 characters
      const newGrid = [...grid];
      newGrid[row][col] = value;
      setGrid(newGrid);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={1}>
        {grid.map((rowData, rowIndex) =>
          rowData.map((cellData, colIndex) => (
            <Grid container key={`${rowIndex}-${colIndex}`}>
              <TextField
                value={cellData}
                onChange={(e) => handleChange(rowIndex, colIndex, e.target.value)}
                sx={{ maxLength: 3, style: { textAlign: "center" } }}
                variant="outlined"
                size="small"
              />
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
};

export default SquaresGrid;
