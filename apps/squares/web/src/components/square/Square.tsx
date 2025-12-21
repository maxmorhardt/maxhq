import { Box, Button, useTheme } from '@mui/material';

interface SquareProps {
  rowIndex: number;
  colIndex: number;
  squareData: string;
  handleSquareClick: (row: number, col: number) => void;
  xLabel?: number;
  yLabel?: number;
  isWinner?: boolean;
}

export default function Square({
  rowIndex,
  colIndex,
  squareData,
  handleSquareClick,
  xLabel,
  yLabel,
  isWinner = false,
}: SquareProps) {
  const theme = useTheme();

  return (
    // square cell with labels and winner highlighting
    <Box sx={{ position: 'relative' }}>
      {/* top label for x-axis */}
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

      {/* left label for y-axis */}
      {colIndex === 0 && yLabel !== undefined && (
        <Box
          sx={{
            position: 'absolute',
            left: { xs: -10, sm: -13, md: -16 },
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

      {/* clickable square button with conditional styling */}
      <Button
        key={`${rowIndex}-${colIndex}`}
        onClick={() => handleSquareClick(rowIndex, colIndex)}
        sx={{
          color: 'white',
          background: isWinner
            ? 'rgba(67, 233, 123, 0.2)'
            : squareData
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(10px)',
          border: isWinner
            ? '2px solid rgba(67, 233, 123, 0.6)'
            : squareData
              ? '1px solid rgba(255,255,255,0.2)'
              : '1px solid rgba(255,255,255,0.08)',
          borderRadius: 1.5,
          padding: 0,
          margin: { xs: 0.1, sm: 0.3, md: 0.4 },
          minWidth: { xs: 28, sm: 42, md: 47 },
          minHeight: { xs: 28, sm: 42, md: 47 },
          fontSize: { xs: 9, sm: 11, md: 14 },
          fontWeight: squareData ? 600 : 400,
          transition: 'all 0.2s ease-in-out',
          cursor: 'pointer',
          '&:hover': {
            background: isWinner
              ? 'rgba(67, 233, 123, 0.3)'
              : squareData
                ? 'rgba(255,255,255,0.15)'
                : 'rgba(255,255,255,0.08)',
            transform: 'translateY(-1px)',
            boxShadow: isWinner
              ? '0 0 4px rgba(67, 233, 123, 0.5)'
              : `0 0 4px ${theme.palette.primary.main}`,
            border: isWinner
              ? '2px solid rgba(67, 233, 123, 0.8)'
              : '1px solid rgba(255,255,255,0.3)',
          },
          '&:active': {
            transform: 'translateY(0px)',
          },
          '&.Mui-disabled': {
            color: 'white',
            opacity: 0.8,
          },
        }}
      >
        {squareData}
      </Button>
    </Box>
  );
}
