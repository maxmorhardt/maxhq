import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { easing, fonts, game } from '../../../app/theme';

// 0 setup, 1 squares claimed, 2 numbers drawn, 3 a quarter has a winner
export type DemoStage = 0 | 1 | 2 | 3;

const AWAY_DIGITS = [3, 7, 1, 9, 4, 0, 6, 2, 8, 5];
const HOME_DIGITS = [2, 8, 4, 0, 5, 6, 1, 9, 3, 7];
const SCORE = { away: 7, home: 14 };
const WINNER = { row: HOME_DIGITS.indexOf(SCORE.home % 10), col: AWAY_DIGITS.indexOf(SCORE.away) };
const YOURS = new Set(['0-4', '3-8', '6-2', '8-6']);
const INITIALS = ['AK', 'JD', 'SR', 'TL', 'BW', 'CG', 'RP', 'MO', 'LH', 'DK', 'EV', 'NB', 'JT'];

const indices = Array.from({ length: 10 }, (_, i) => i);

interface Cell {
  key: string;
  label: string;
  yours: boolean;
  winner: boolean;
  claimedAt: DemoStage;
  order: number;
}

// a fixed board, so every render of the demo tells the same story
const cells: Cell[] = indices.flatMap((row) =>
  indices.map((col) => {
    const key = `${row}-${col}`;
    const yours = YOURS.has(key);
    const winner = row === WINNER.row && col === WINNER.col;
    const early = yours || winner || (row * 7 + col * 3) % 11 < 7;

    return {
      key,
      label: yours ? 'YOU' : INITIALS[(row * 13 + col * 7) % INITIALS.length],
      yours,
      winner,
      claimedAt: yours && row === 0 ? 0 : early ? 1 : 2,
      order: ((row * 10 + col) * 37) % 100,
    };
  })
);

const descriptions: Record<DemoStage, string> = {
  0: 'An empty ten by ten squares board with one of your squares claimed.',
  1: 'The board filling up as friends claim squares.',
  2: 'A full board with the digits zero to nine drawn along each axis.',
  3: `End of the quarter, away ${SCORE.away} and home ${SCORE.home}: the square at home ${SCORE.home % 10}, away ${SCORE.away} wins.`,
};

const status: Record<DemoStage, string> = {
  0: 'Pregame',
  1: 'Pregame',
  2: '1st · 15:00',
  3: 'End Q2',
};

const digitSx = {
  display: 'grid',
  placeItems: 'center',
  fontFamily: fonts.display,
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums',
  fontSize: 'clamp(0.72rem, 1.5vw, 1rem)',
  lineHeight: 1,
} as const;

function ScoreBug({ stage }: { stage: DemoStage }) {
  const final = stage === 3;

  const team = (name: string, score: number) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Typography
        component="span"
        sx={{
          fontFamily: fonts.display,
          fontWeight: 700,
          letterSpacing: '0.1em',
          fontSize: '0.8rem',
        }}
      >
        {name}
      </Typography>
      <Typography
        component="span"
        sx={{
          minWidth: '2ch',
          textAlign: 'right',
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: '1.35rem',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          color: final ? 'text.primary' : 'text.secondary',
          transition: `color 400ms ${easing.out}`,
        }}
      >
        {final ? score : 0}
      </Typography>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        mb: 1.5,
        px: 1.75,
        py: 1,
        borderRadius: '10px',
        bgcolor: game.night,
        border: 1,
        borderColor: 'divider',
      }}
    >
      {team('AWAY', SCORE.away)}
      <Typography
        component="span"
        sx={{
          px: 1,
          py: 0.25,
          borderRadius: '6px',
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: '0.74rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: final ? game.night : 'text.secondary',
          bgcolor: final ? 'secondary.main' : 'transparent',
          transition: `background-color 400ms ${easing.out}, color 400ms ${easing.out}`,
        }}
      >
        {status[stage]}
      </Typography>
      {team('HOME', SCORE.home)}
    </Box>
  );
}

interface Props {
  stage: DemoStage;
}

export default function DemoBoard({ stage }: Props) {
  const drawn = stage >= 2;
  const decided = stage === 3;

  return (
    <Box
      role="img"
      aria-label={descriptions[stage]}
      sx={{
        width: '100%',
        maxWidth: 540,
        p: { xs: 1.5, sm: 2 },
        borderRadius: '18px',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        boxShadow: '0 40px 90px -40px rgba(0, 0, 0, 0.9)',
      }}
    >
      <ScoreBug stage={stage} />

      <Box
        aria-hidden
        sx={{
          display: 'grid',
          gridTemplateColumns: 'clamp(14px, 3.4vw, 22px) repeat(10, minmax(0, 1fr))',
          gap: { xs: '3px', sm: '4px' },
        }}
      >
        <span />
        {AWAY_DIGITS.map((digit, col) => (
          <Box
            key={`away-${col}`}
            sx={{
              ...digitSx,
              pb: 0.5,
              color: decided && col === WINNER.col ? 'secondary.main' : 'text.primary',
              opacity: drawn ? 1 : 0.25,
              transform: drawn ? 'none' : 'translateY(-6px)',
              transition: `opacity 500ms ${easing.out} ${col * 45}ms, transform 500ms ${easing.out} ${col * 45}ms, color 300ms`,
            }}
          >
            {drawn ? digit : '–'}
          </Box>
        ))}

        {indices.map((row) => (
          <Box key={`row-${row}`} sx={{ display: 'contents' }}>
            <Box
              sx={{
                ...digitSx,
                color: decided && row === WINNER.row ? 'secondary.main' : 'text.primary',
                opacity: drawn ? 1 : 0.25,
                transform: drawn ? 'none' : 'translateX(-6px)',
                transition: `opacity 500ms ${easing.out} ${row * 45}ms, transform 500ms ${easing.out} ${row * 45}ms, color 300ms`,
              }}
            >
              {drawn ? HOME_DIGITS[row] : '–'}
            </Box>

            {cells.slice(row * 10, row * 10 + 10).map((cell) => {
              const claimed = stage >= cell.claimedAt;
              const won = decided && cell.winner;

              return (
                <Box
                  key={cell.key}
                  sx={{
                    aspectRatio: '1',
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: { xs: '4px', sm: '6px' },
                    border: 1,
                    fontFamily: fonts.display,
                    fontWeight: 700,
                    fontSize: 'clamp(0.5rem, 1.25vw, 0.78rem)',
                    letterSpacing: '0.02em',
                    lineHeight: 1,
                    overflow: 'hidden',
                    borderColor: won
                      ? 'secondary.main'
                      : cell.yours && claimed
                        ? alpha(game.brand, 0.7)
                        : claimed
                          ? game.lineStrong
                          : game.line,
                    bgcolor: won
                      ? 'secondary.main'
                      : cell.yours && claimed
                        ? alpha(game.brand, 0.16)
                        : claimed
                          ? game.raised
                          : 'transparent',
                    color: won ? game.night : cell.yours ? 'primary.main' : 'text.primary',
                    boxShadow: won ? `0 6px 22px -4px ${alpha(game.gold, 0.7)}` : 'none',
                    transform: won ? 'scale(1.12)' : 'none',
                    zIndex: won ? 1 : 0,
                    transition: [
                      `background-color 380ms ${easing.out} ${claimed && !won ? cell.order * 9 : 0}ms`,
                      `border-color 380ms ${easing.out} ${claimed && !won ? cell.order * 9 : 0}ms`,
                      `transform 500ms ${easing.spring}`,
                      'box-shadow 500ms',
                    ].join(', '),
                    '& > span': {
                      opacity: claimed ? 1 : 0,
                      transition: `opacity 300ms ${easing.out} ${claimed ? cell.order * 9 + 120 : 0}ms`,
                    },
                    '@media (prefers-reduced-motion: reduce)': {
                      transition: 'none',
                      '& > span': { transition: 'none' },
                    },
                  }}
                >
                  <span>{cell.label}</span>
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
