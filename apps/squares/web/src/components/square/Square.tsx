import { Box, Button, useTheme } from '@mui/material';

interface SquareProps {
  rowIndex: number;
  colIndex: number;
  squareData: string;
  handleSquareClick: (row: number, col: number) => void;
  xLabel?: number;
  yLabel?: number;
  immutable?: boolean;
}

export default function Square({
  rowIndex,
  colIndex,
  squareData,
  handleSquareClick,
  xLabel,
  yLabel,
  immutable = false,
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

      {/* Square */}
      <Button
        key={`${rowIndex}-${colIndex}`}
        onClick={immutable ? undefined : () => handleSquareClick(rowIndex, colIndex)}
        disabled={immutable}
        sx={{
          color: 'white',
          background: squareData ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(10px)',
          border: squareData
            ? '1px solid rgba(255,255,255,0.2)'
            : '1px solid rgba(255,255,255,0.08)',
          borderRadius: 1.5,
          padding: 0,
          margin: { xs: 0.1, sm: 0.3, md: 0.4 },
          minWidth: { xs: 28, sm: 45, md: 50 },
          minHeight: { xs: 28, sm: 45, md: 50 },
          fontSize: { xs: 9, sm: 11, md: 14 },
          fontWeight: squareData ? 600 : 400,
          transition: 'all 0.2s ease-in-out',
          cursor: immutable ? 'default' : 'pointer',
          '&:hover': immutable
            ? {}
            : {
                background: squareData ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
                transform: 'translateY(-2px)',
                boxShadow: `0 0 10px ${theme.palette.primary.main}`,
                border: '1px solid rgba(255,255,255,0.3)',
              },
          '&:active': immutable
            ? {}
            : {
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
