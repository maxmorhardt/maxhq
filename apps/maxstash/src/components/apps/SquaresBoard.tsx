import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GridViewIcon from '@mui/icons-material/GridView';
import { Box, Typography } from '@mui/material';

import { easing, fonts, primaryTint } from '../../theme';

const awayNumbers = [3, 7, 1, 9, 4];
const homeNumbers = [2, 8, 0, 5, 6];
const winnerCell = '2,2';
const claimed: Record<string, string> = {
  '0,1': 'MM',
  '0,4': 'AK',
  '1,0': 'JD',
  '1,3': 'SR',
  '2,2': '',
  '3,1': 'TL',
  '3,4': 'BW',
  '4,0': 'CG',
  '4,3': 'RP',
};

// the score digits the winning square sits on, so the caption can't drift from the grid
const [winnerRow, winnerCol] = winnerCell.split(',').map(Number);
const winnerDigits = { home: homeNumbers[winnerRow], away: awayNumbers[winnerCol] };

type CellState = 'winner' | 'claimed' | 'open';

function cellState(r: number, c: number): CellState {
  const key = `${r},${c}`;

  if (key === winnerCell) {
    return 'winner';
  }

  return key in claimed ? 'claimed' : 'open';
}

const axisSx = {
  display: 'grid',
  placeItems: 'center',
  fontFamily: fonts.mono,
  fontSize: '0.78rem',
  color: 'text.secondary',
} as const;

export interface SquaresBoardProps {
  // the parent reveal drives the cell pop-in animation
  animate?: boolean;
}

export default function SquaresBoard({ animate = true }: SquaresBoardProps) {
  const rows = [0, 1, 2, 3, 4];

  return (
    <Box sx={{ width: 'min(340px, 100%)' }}>
      <Box
        aria-hidden
        sx={{ display: 'grid', gridTemplateColumns: '1.3rem repeat(5, 1fr)', gap: '0.4rem' }}
      >
        {/* corner + away numbers across the top */}
        <Box component="span" sx={{ ...axisSx, color: 'primary.main', opacity: 0.7 }}>
          <GridViewIcon sx={{ fontSize: '0.78rem' }} />
        </Box>
        {awayNumbers.map((n) => (
          <Box component="span" key={`a-${n}`} sx={axisSx}>
            {n}
          </Box>
        ))}

        {/* home number then a row of cells, for each row */}
        {rows.map((r) => (
          <Box key={`r-${r}`} sx={{ display: 'contents' }}>
            <Box component="span" sx={axisSx}>
              {homeNumbers[r]}
            </Box>

            {rows.map((c) => {
              const state = cellState(r, c);

              return (
                <Box
                  component="span"
                  key={`c-${r}-${c}`}
                  sx={{
                    aspectRatio: '1',
                    display: 'grid',
                    placeItems: 'center',
                    border: 1,
                    // fixed radius; the theme's 12px base would make these circles
                    borderRadius: '8px',
                    fontFamily: fonts.mono,
                    fontSize: '0.62rem',
                    letterSpacing: '0.03em',
                    ...(state === 'winner' && {
                      bgcolor: 'primary.main',
                      borderColor: 'primary.main',
                      color: 'primary.contrastText',
                      fontSize: '0.85rem',
                      boxShadow: (theme) => `0 0 0 3px ${primaryTint(theme, 0.25)}`,
                    }),
                    ...(state === 'claimed' && {
                      bgcolor: (theme) => primaryTint(theme, 0.12),
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      fontWeight: 600,
                    }),
                    ...(state === 'open' && {
                      bgcolor: 'background.default',
                      borderColor: 'divider',
                      color: 'text.secondary',
                    }),

                    opacity: 0,
                    transform: 'scale(0.7)',
                    ...(animate && {
                      animation: `cell-pop 0.4s ${easing.spring} both`,
                      animationDelay: `${(r * 5 + c) * 32}ms`,
                    }),
                    '@keyframes cell-pop': {
                      to: { opacity: 1, transform: 'scale(1)' },
                    },
                    '@media (prefers-reduced-motion: reduce)': {
                      opacity: 1,
                      transform: 'none',
                      animation: 'none',
                    },
                  }}
                >
                  {state === 'winner' ? (
                    <EmojiEventsIcon sx={{ fontSize: '0.85rem' }} />
                  ) : (
                    claimed[`${r},${c}`]
                  )}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>

      <Typography
        aria-hidden
        align="center"
        color="text.secondary"
        sx={{ mt: 1, fontFamily: fonts.mono, fontSize: '0.72rem', opacity: 0.7 }}
      >
        Q3 winner · home {winnerDigits.home}, away {winnerDigits.away}
      </Typography>
    </Box>
  );
}
