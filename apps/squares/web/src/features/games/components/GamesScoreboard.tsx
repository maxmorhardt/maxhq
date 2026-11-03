import { Box, Button, Chip, Skeleton, Typography } from '@mui/material';
import { useState } from 'react';
import type { ScoreboardWeek } from '../../../types/contest';
import { canStartBoard, gamesByDay, isLive } from '../../../utils/game';
import { useGetScoreboardQuery } from '../api';
import CreateContestButton from '../../contests/components/CreateContestButton';
import DayHeading from './DayHeading';
import GameCard from './GameCard';
import WeekBar, { WeekBarSkeleton } from './WeekBar';

const gridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
  gap: 1.5,
} as const;

const cardSx = {
  p: 2,
  borderRadius: '16px',
  border: 1,
  borderColor: 'divider',
  bgcolor: 'background.paper',
  display: 'grid',
  gap: 1.25,
} as const;

function TeamRowSkeleton() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Skeleton variant="circular" width={34} height={34} />
      <Skeleton variant="text" sx={{ flex: 1, maxWidth: 160 }} />
      <Skeleton variant="text" width={28} height={34} sx={{ ml: 'auto' }} />
    </Box>
  );
}

function ScoreboardSkeleton() {
  return (
    <Box data-testid="scoreboard-loading" aria-busy>
      <WeekBarSkeleton />
      <Skeleton variant="text" width={180} height={24} sx={{ mb: 1.5 }} />
      <Box sx={gridSx}>
        {[0, 1, 2, 3].map((i) => (
          <Box key={i} sx={cardSx}>
            <Skeleton variant="text" width={90} height={22} />
            <TeamRowSkeleton />
            <TeamRowSkeleton />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// one week of NFL games with a way to step through the season; a contest page is where scores update live
export default function GamesScoreboard() {
  const [week, setWeek] = useState<ScoreboardWeek | undefined>(undefined);
  const { currentData: board, isFetching, isError, refetch } = useGetScoreboardQuery(week);

  if (isFetching && !board) {
    return <ScoreboardSkeleton />;
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
      <WeekBar
        label={board.label}
        previous={board.previous}
        next={board.next}
        onWeek={setWeek}
        detail={
          <>
            {board.season ? <span>{board.season} season</span> : null}
            {live > 0 && (
              <Chip size="small" color="error" label={`${live} live`} sx={{ height: 20 }} />
            )}
          </>
        }
      />

      {board.games.length === 0 ? (
        <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>
          No games scheduled yet. Playoff matchups show up once they are set.
        </Typography>
      ) : (
        <Box sx={{ display: 'grid', gap: 3.5 }}>
          {gamesByDay(board.games).map(([day, games]) => (
            <Box key={day} component="section" aria-label={day}>
              <DayHeading day={day} />
              <Box sx={gridSx}>
                {games.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    action={
                      canStartBoard(game) ? (
                        <CreateContestButton look="link" label="Start a board" gameId={game.id} />
                      ) : undefined
                    }
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
