import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { Box, Button, Chip, IconButton, Skeleton, Typography } from '@mui/material';
import { useState } from 'react';
import { fonts } from '../../../app/theme';
import type { Game, ScoreboardWeek } from '../../../types/contest';
import { isLive } from '../../../utils/game';
import { useGetScoreboardQuery } from '../api';
import GameCard from './GameCard';

function byDay(games: Game[]): [string, Game[]][] {
  const days = new Map<string, Game[]>();
  for (const game of games) {
    const day = new Date(game.gameTime).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    days.set(day, [...(days.get(day) ?? []), game]);
  }
  return [...days.entries()];
}

const gridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
  gap: 1.5,
} as const;

// one week of NFL games with a way to step through the season; a contest page is where scores update live
export default function GamesScoreboard() {
  const [week, setWeek] = useState<ScoreboardWeek | undefined>(undefined);
  const { data: board, isLoading, isError, refetch } = useGetScoreboardQuery(week);

  if (isLoading) {
    return (
      <Box sx={gridSx} data-testid="scoreboard-loading">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" height={150} sx={{ borderRadius: '16px' }} />
        ))}
      </Box>
    );
  }

  if (isError || !board) {
    return (
      <Box role="alert" sx={{ textAlign: 'center', py: 6 }}>
        <Typography sx={{ fontWeight: 600 }}>Scores are unavailable right now.</Typography>
        <Button onClick={() => void refetch()} sx={{ mt: 1.5 }}>
          Try again
        </Button>
      </Box>
    );
  }

  const live = board.games.filter((g) => isLive(g)).length;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          mb: 3,
          p: 1,
          borderRadius: '14px',
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <IconButton
          aria-label="Previous week"
          onClick={() => setWeek(board.previous)}
          disabled={!board.previous}
        >
          <ChevronLeft />
        </IconButton>
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            component="h2"
            sx={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: '1.5rem',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            {board.label || 'This Week'}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 0.75 }}>
            {board.season ? (
              <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                {board.season} season
              </Typography>
            ) : null}
            {live > 0 && (
              <Chip size="small" color="error" label={`${live} live`} sx={{ height: 20 }} />
            )}
          </Box>
        </Box>
        <IconButton
          aria-label="Next week"
          onClick={() => setWeek(board.next)}
          disabled={!board.next}
        >
          <ChevronRight />
        </IconButton>
      </Box>

      {board.games.length === 0 ? (
        <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>
          No games scheduled yet. Playoff matchups show up once they are set.
        </Typography>
      ) : (
        <Box sx={{ display: 'grid', gap: 3.5 }}>
          {byDay(board.games).map(([day, games]) => (
            <Box key={day} component="section" aria-label={day}>
              <Typography
                component="h3"
                sx={{
                  mb: 1.5,
                  fontFamily: fonts.display,
                  fontWeight: 700,
                  fontSize: '1rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                }}
              >
                {day}
              </Typography>
              <Box sx={gridSx}>
                {games.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
