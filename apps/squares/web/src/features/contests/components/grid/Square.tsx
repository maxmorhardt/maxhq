import { Box, Button, keyframes } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { memo } from 'react';
import { fonts, game } from '../../../../app/theme';

const winnerPulse = keyframes`
  0% { box-shadow: 0 0 0 0 ${alpha(game.gold, 0.7)}; transform: scale(1); }
  20% { box-shadow: 0 0 0 8px ${alpha(game.gold, 0)}; transform: scale(1.18); }
  45% { box-shadow: 0 0 0 0 ${alpha(game.gold, 0.6)}; transform: scale(1); }
  65% { box-shadow: 0 0 0 8px ${alpha(game.gold, 0)}; transform: scale(1.18); }
  100% { box-shadow: 0 4px 16px -4px ${alpha(game.gold, 0.6)}; transform: scale(1); }
`;

interface SquareProps {
  rowIndex: number;
  colIndex: number;
  squareData: string;
  handleSquareClick: (row: number, col: number) => void;
  xLabel?: number;
  yLabel?: number;
  isWinner?: boolean;
  isMine?: boolean;
  isNewWinner?: boolean;
}

const axisSx = {
  position: 'absolute',
  fontFamily: fonts.display,
  fontWeight: 800,
  fontSize: { xs: 10, sm: 15, md: 17 },
  lineHeight: 1,
  fontVariantNumeric: 'tabular-nums',
  color: game.chalk,
} as const;

function Square({
  rowIndex,
  colIndex,
  squareData,
  handleSquareClick,
  xLabel,
  yLabel,
  isWinner = false,
  isMine = false,
  isNewWinner = false,
}: SquareProps) {
  const claimed = squareData !== '';

  const tone = isWinner
    ? { bg: game.gold, border: game.gold, color: game.night, hover: '#ffd668' }
    : isMine
      ? {
          bg: alpha(game.brand, 0.16),
          border: alpha(game.brand, 0.7),
          color: game.brand,
          hover: alpha(game.brand, 0.26),
        }
      : claimed
        ? { bg: game.raised, border: game.lineStrong, color: game.chalk, hover: '#1c2a46' }
        : {
            bg: 'transparent',
            border: game.line,
            color: game.chalk,
            hover: alpha(game.brand, 0.08),
          };

  return (
    // square cell with labels and winner highlighting
    <Box sx={{ position: 'relative' }}>
      {/* top label for x-axis */}
      {rowIndex === 0 && xLabel !== undefined && (
        <Box
          sx={{
            ...axisSx,
            top: { xs: -13, sm: -21, md: -24 },
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: xLabel === -1 ? 0.35 : 1,
          }}
        >
          {xLabel === -1 ? '-' : xLabel}
        </Box>
      )}

      {/* left label for y-axis */}
      {colIndex === 0 && yLabel !== undefined && (
        <Box
          sx={{
            ...axisSx,
            left: { xs: -11, sm: -16, md: -19 },
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: yLabel === -1 ? 0.35 : 1,
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
          color: tone.color,
          background: tone.bg,
          border: `1px solid ${tone.border}`,
          borderRadius: { xs: '5px', sm: '7px' },
          padding: 0,
          margin: { xs: 0, sm: 0.3, md: 0.4 },
          minWidth: { xs: 24, sm: 42, md: 47 },
          minHeight: { xs: 24, sm: 42, md: 47 },
          fontFamily: fonts.display,
          fontSize: { xs: 9, sm: 13, md: 15 },
          fontWeight: claimed ? 700 : 500,
          letterSpacing: '0.02em',
          boxShadow: isWinner ? `0 4px 16px -4px ${alpha(game.gold, 0.6)}` : 'none',
          transition: 'background-color 160ms, border-color 160ms, transform 160ms',
          cursor: 'pointer',
          animation: isNewWinner ? `${winnerPulse} 2.2s ease-out` : undefined,
          '&:hover': {
            background: tone.hover,
            borderColor: isWinner ? game.gold : isMine || !claimed ? game.brand : game.muted,
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0px)',
          },
          '&.Mui-disabled': {
            color: tone.color,
            opacity: 0.8,
          },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      >
        {squareData}
      </Button>
    </Box>
  );
}

export default memo(Square);
