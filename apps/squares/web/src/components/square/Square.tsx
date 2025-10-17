import { Box, Button, useTheme } from '@mui/material';

interface SquareProps {
  rowIndex: number;
  colIndex: number;
  squareData: string;
  handleSquareClick: (row: number, col: number) => void;
  xLabel?: number;
  yLabel?: number;
}

export default function Square({
  rowIndex,
  colIndex,
  squareData,
  handleSquareClick,
  xLabel,
  yLabel,
}: SquareProps) {
  const theme = useTheme();

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Top label */}
      {rowIndex === 0 && xLabel !== undefined && (
        <Box
          sx={{
            position: 'absolute',
            top: { xs: -12, sm: -18, md: -20 },
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: { xs: 8, sm: 12, md: 14 },
            fontWeight: 'bold',
            color: theme.palette.text.secondary,
          }}
        >
          {xLabel === -1 ? '-' : xLabel}
        </Box>
      )}

      {/* Left label */}
      {colIndex === 0 && yLabel !== undefined && (
        <Box
          sx={{
            position: 'absolute',
            left: { xs: -12, sm: -18, md: -20 },
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: { xs: 8, sm: 12, md: 14 },
            fontWeight: 'bold',
            color: theme.palette.text.secondary,
          }}
        >
          {yLabel === -1 ? '-' : yLabel}
        </Box>
      )}

      {/* Square */}
      <Button
        key={`${rowIndex}-${colIndex}`}
        onClick={() => handleSquareClick(rowIndex, colIndex)}
        sx={{
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          padding: 0,
          margin: { xs: 0.1, sm: 0.3, md: 0.4 },
          minWidth: { xs: 28, sm: 45, md: 50 },
          minHeight: { xs: 28, sm: 45, md: 50 },
          fontSize: { xs: 9, sm: 11, md: 14 },
        }}
      >
        {squareData}
      </Button>
    </Box>
  );
}
