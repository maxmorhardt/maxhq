import { Close, EmojiEvents } from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  keyframes,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useState } from 'react';
import { easing, fonts, game } from '../../../app/theme';
import type { QuarterResult } from '../../../types/contest';

interface Props {
  result: QuarterResult | null;
  onClose: () => void;
}

const paperIn = keyframes`
  from { opacity: 0; transform: translateY(16px) scale(0.96); }
  to { opacity: 1; transform: none; }
`;

const rise = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
`;

const wipe = keyframes`
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const pop = keyframes`
  from { opacity: 0; transform: scale(0.6); }
  to { opacity: 1; transform: scale(1); }
`;

const ring = keyframes`
  from { opacity: 0.8; transform: scale(1); }
  to { opacity: 0; transform: scale(2.6); }
`;

const LANES = Array.from({ length: 10 }, (_, i) => i);
const GAP = 3;
const SWEEP_AT = 480;
const SWEEP_STEP = 30;
const WINNER_AT = SWEEP_AT + LANES.length * SWEEP_STEP + 60;

// reduced motion keeps the reveal order but drops the movement
function enter(
  name: ReturnType<typeof keyframes>,
  delay: number,
  duration = 400,
  curve = easing.out
) {
  return {
    animation: `${name} ${duration}ms ${curve} ${delay}ms both`,
    '@media (prefers-reduced-motion: reduce)': {
      animation: `${fadeIn} 200ms ease ${Math.min(delay, 300)}ms both`,
    },
  };
}

function ScoreDigits({ value }: { value: number }) {
  return (
    <>
      {String(value).slice(0, -1)}
      <Box component="span" sx={{ color: game.gold }}>
        {value % 10}
      </Box>
    </>
  );
}

interface BoardProps {
  row: number;
  col: number;
  rowDigit: number;
  colDigit: number;
}

// the winning row and column sweep across a mini board and meet at the winning square
function WinningBoard({ row, col, rowDigit, colDigit }: BoardProps) {
  const axisLabel = {
    position: 'absolute',
    display: 'grid',
    placeItems: 'center',
    fontFamily: fonts.display,
    fontWeight: 800,
    fontSize: '0.8rem',
    lineHeight: 1,
    color: game.gold,
    ...enter(fadeIn, SWEEP_AT + 200, 300),
  } as const;

  // the digits sit outside the frame so the grid itself stays centered
  const offset = (lane: number) => `calc((100% + ${GAP}px) * ${lane} / 10)`;
  const cell = `calc((100% - ${GAP * 9}px) / 10)`;

  return (
    <Box
      aria-hidden
      sx={{
        width: '100%',
        maxWidth: 230,
        mx: 'auto',
        p: 1.25,
        borderRadius: '14px',
        bgcolor: game.night,
        border: 1,
        borderColor: game.line,
        ...enter(fadeIn, 260, 300),
      }}
    >
      <Box
        sx={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          gap: `${GAP}px`,
        }}
      >
        <Typography
          sx={{ ...axisLabel, bottom: 'calc(100% + 14px)', left: offset(col), width: cell }}
        >
          {colDigit}
        </Typography>
        <Typography
          sx={{ ...axisLabel, right: 'calc(100% + 14px)', top: offset(row), height: cell }}
        >
          {rowDigit}
        </Typography>

        {LANES.map((r) =>
          LANES.map((c) => {
            const winner = r === row && c === col;
            const lane = r === row || c === col;
            const laneDelay = SWEEP_AT + (r === row ? c : r) * SWEEP_STEP;

            return (
              <Box
                key={`${r}-${c}`}
                sx={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: '3px',
                  border: 1,
                  borderColor: game.line,
                  ...(lane && {
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      inset: -1,
                      borderRadius: '3px',
                      ...(winner
                        ? {
                            bgcolor: game.gold,
                            boxShadow: `0 0 14px ${alpha(game.gold, 0.8)}`,
                            ...enter(pop, WINNER_AT, 500, easing.spring),
                          }
                        : {
                            bgcolor: alpha(game.gold, 0.18),
                            border: `1px solid ${alpha(game.gold, 0.35)}`,
                            ...enter(fadeIn, laneDelay, 240),
                          }),
                    },
                  }),
                  ...(winner && {
                    zIndex: 1,
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: -1,
                      borderRadius: '3px',
                      border: `2px solid ${game.gold}`,
                      opacity: 0,
                      animation: `${ring} 900ms ${easing.out} ${WINNER_AT + 300}ms 2`,
                      '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                    },
                  }),
                }}
              />
            );
          })
        )}
      </Box>
    </Box>
  );
}

export default function WinnerCelebrationDialog({ result, onClose }: Props) {
  // keep the last result on screen while the dialog fades out
  const [shown, setShown] = useState(result);
  if (result && result !== shown) {
    setShown(result);
  }

  const home = shown?.homeTeamScore ?? 0;
  const away = shown?.awayTeamScore ?? 0;

  return (
    <Dialog
      open={!!result}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            overflow: 'hidden',
            bgcolor: game.field,
            borderColor: alpha(game.gold, 0.45),
            backgroundImage: `radial-gradient(90% 55% at 50% 0%, ${alpha(game.gold, 0.14)}, transparent 70%)`,
            boxShadow: `0 40px 90px -30px ${alpha(game.gold, 0.35)}`,
            ...enter(paperIn, 0, 420),
          },
        },
      }}
    >
      <IconButton
        aria-label="Close"
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: 'text.secondary',
          '&:hover': { color: 'text.primary' },
          zIndex: 1,
        }}
      >
        <Close />
      </IconButton>

      <DialogContent sx={{ textAlign: 'center', pt: 4.5, pb: 4, px: { xs: 2.5, sm: 4 } }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.5,
            py: 0.5,
            borderRadius: '6px',
            bgcolor: game.gold,
            color: game.night,
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: '0.95rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            ...enter(wipe, 100, 450),
          }}
        >
          <EmojiEvents sx={{ fontSize: 18 }} />Q{shown?.quarter} Final
        </Box>

        <Typography
          component="h2"
          sx={{
            mt: 1.5,
            mb: 3,
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: { xs: '2.4rem', sm: '2.8rem' },
            lineHeight: 0.95,
            textTransform: 'uppercase',
            ...enter(rise, 180),
          }}
        >
          Your Square Hit
        </Typography>

        <WinningBoard
          row={shown?.winnerRow ?? 0}
          col={shown?.winnerCol ?? 0}
          rowDigit={home % 10}
          colDigit={away % 10}
        />

        <Typography
          sx={{
            mt: 3,
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: '2.6rem',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            ...enter(rise, WINNER_AT - 120),
          }}
        >
          <ScoreDigits value={home} />
          <Box component="span" sx={{ color: 'text.secondary', mx: 1.5 }}>
            &ndash;
          </Box>
          <ScoreDigits value={away} />
        </Typography>
        <Typography sx={{ mt: 1, mb: 3, color: 'text.secondary', ...enter(rise, WINNER_AT - 40) }}>
          Last digits {home % 10} and {away % 10} landed on your square.
        </Typography>

        <Box sx={enter(rise, WINNER_AT + 40)}>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={onClose}
            sx={{ px: 5 }}
          >
            Back to the Board
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
