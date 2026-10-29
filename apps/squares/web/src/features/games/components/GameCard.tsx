import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { fonts, game as palette } from '../../../app/theme';
import TeamMark from '../../../components/TeamMark';
import type { Game } from '../../../types/contest';
import { gameClock, hasKickedOff, isLive } from '../../../utils/game';

interface Props {
  game: Game;
}

const QUARTERS = [1, 2, 3, 4];

// points scored in each quarter, from the running score at the end of each one
function lineScore(game: Game, side: 'home' | 'away'): (number | null)[] {
  const scores = [...(game.scores ?? [])].sort((a, b) => a.quarter - b.quarter);
  return QUARTERS.map((quarter) => {
    const end = scores.find((s) => s.quarter === quarter);
    if (!end) {
      return null;
    }
    const before = scores.find((s) => s.quarter === quarter - 1);
    const total = side === 'home' ? end.homeScore : end.awayScore;
    const previous = before ? (side === 'home' ? before.homeScore : before.awayScore) : 0;
    return total - previous;
  });
}

const cellSx = {
  width: 28,
  textAlign: 'center',
  fontFamily: fonts.display,
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
  color: 'text.secondary',
} as const;

function TeamRow({ game, side }: { game: Game; side: 'away' | 'home' }) {
  const score = side === 'home' ? game.homeScore : game.awayScore;
  const other = side === 'home' ? game.awayScore : game.homeScore;
  const started = hasKickedOff(game);
  const trailing = game.status === 'final' && score < other;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, opacity: trailing ? 0.6 : 1 }}>
      <TeamMark
        abbr={side === 'home' ? game.homeAbbr : game.awayAbbr}
        name={side === 'home' ? game.homeTeam : game.awayTeam}
        size={34}
      />
      <Typography noWrap sx={{ flex: 1, minWidth: 0, fontWeight: 600 }}>
        {side === 'home' ? game.homeTeam : game.awayTeam}
      </Typography>
      <Box aria-hidden sx={{ display: { xs: 'none', sm: 'flex' } }}>
        {lineScore(game, side).map((points, i) => (
          <Box key={i} component="span" sx={cellSx}>
            {points ?? '–'}
          </Box>
        ))}
      </Box>
      <Typography
        aria-label={`${side === 'home' ? game.homeTeam : game.awayTeam} score`}
        sx={{
          minWidth: '2.2ch',
          textAlign: 'right',
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: '1.7rem',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          color: started ? 'text.primary' : 'text.secondary',
        }}
      >
        {started ? score : '–'}
      </Typography>
    </Box>
  );
}

export default function GameCard({ game }: Props) {
  const live = isLive(game);

  return (
    <Box
      component="article"
      aria-label={`${game.awayTeam} at ${game.homeTeam}`}
      sx={{
        p: 2,
        borderRadius: '16px',
        border: 1,
        borderColor: live ? alpha(palette.flag, 0.5) : 'divider',
        bgcolor: 'background.paper',
        display: 'grid',
        gap: 1.25,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Typography
            sx={{
              fontFamily: fonts.display,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontSize: '0.9rem',
              color: live ? 'text.primary' : 'text.secondary',
            }}
          >
            {gameClock(game)}
          </Typography>
          {live && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                fontFamily: fonts.display,
                fontWeight: 700,
                fontSize: '0.74rem',
                letterSpacing: '0.16em',
                color: 'error.main',
              }}
            >
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  bgcolor: 'error.main',
                  animation: 'game-live 1.6s ease-in-out infinite',
                  '@keyframes game-live': { '50%': { opacity: 0.3 } },
                  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                }}
              />
              LIVE
            </Box>
          )}
        </Box>
        {hasKickedOff(game) && (
          <Box aria-hidden sx={{ display: { xs: 'none', sm: 'flex' }, mr: 'calc(2.2ch + 12px)' }}>
            {QUARTERS.map((q) => (
              <Box key={q} component="span" sx={{ ...cellSx, fontSize: '0.75rem' }}>
                {q}
              </Box>
            ))}
          </Box>
        )}
      </Box>
      <TeamRow game={game} side="away" />
      <TeamRow game={game} side="home" />
    </Box>
  );
}
