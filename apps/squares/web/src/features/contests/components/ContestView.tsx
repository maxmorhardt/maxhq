import { Box } from '@mui/material';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { hasKickedOff } from '../../../utils/game';
import type { StreamStatus } from '../../../api/eventStream';
import type { ActivityEvent, Contest, Game, Player } from '../../../types/contest';
import { getSquarePool, isBoardOpen, type ContestViewer } from '../live/viewer';
import ContestDetails from './details/ContestDetails';
import ContestDialogs, { type ContestDialog } from './details/ContestDialogs';
import ContestGrid, { type SquarePosition } from './grid/ContestGrid';
import ContestScoreboard from './scoreboard/ContestScoreboard';
import QuarterStrip from './scoreboard/QuarterStrip';
import ActivityFeed from './sidebar/ActivityFeed';
import ContestStatusBanner from './ContestStatusBanner';

interface Props {
  contest: Contest;
  game?: Game;
  players: Player[];
  activity: ActivityEvent[];
  viewer: ContestViewer;
  status: StreamStatus;
  winnerFlash: SquarePosition | null;
  onStale: () => void;
}

// the contest page: the broadcast header and quarter strip, then the board beside its panels
export default function ContestView({
  contest,
  game,
  players,
  activity,
  viewer,
  status,
  winnerFlash,
  onStale,
}: Props) {
  const [dialog, setDialog] = useState<ContestDialog | null>(null);
  const boardOpen = isBoardOpen(contest);
  const waiting = viewer.isOwner && boardOpen ? getSquarePool(contest, players).waiting : [];

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 1240,
        mx: 'auto',
        px: { xs: 1, sm: 2 },
        pt: { xs: 2, sm: 3 },
        pb: 5,
        display: 'grid',
        gap: { xs: 2, sm: 2.5 },
      }}
    >
      <Helmet>
        <title>{`${contest.name} – Squares`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <ContestScoreboard
        contest={contest}
        game={game}
        players={players}
        viewer={viewer}
        status={status}
        onRetry={onStale}
        onOpen={setDialog}
        squaresToGive={waiting.length > 0}
      />

      <ContestStatusBanner
        contest={contest}
        players={players}
        viewer={viewer}
        waiting={waiting}
        boardOpen={boardOpen}
        kickedOff={!!game && hasKickedOff(game)}
        onOpen={setDialog}
      />

      <QuarterStrip contest={contest} game={game} viewer={viewer} />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.25fr) minmax(0, 1fr)' },
          gap: { xs: 2, sm: 2.5 },
        }}
      >
        <Box sx={{ minWidth: 0, display: 'grid', gap: { xs: 1.5, sm: 2 }, alignContent: 'start' }}>
          <ContestGrid
            contest={contest}
            viewer={viewer}
            winnerFlash={winnerFlash}
            onStale={onStale}
          />
        </Box>

        {/* on wide screens the board sets the row height and this column fills it */}
        <Box sx={{ position: 'relative', minWidth: 0 }}>
          <Box
            sx={{
              position: { lg: 'absolute' },
              inset: { lg: 0 },
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: 2, sm: 2.5 },
            }}
          >
            <ContestDetails contest={contest} game={game} viewer={viewer} />
            <ActivityFeed events={activity} />
          </Box>
        </Box>
      </Box>

      <ContestDialogs
        open={dialog}
        onOpen={setDialog}
        onClose={() => setDialog(null)}
        contest={contest}
        players={players}
        viewer={viewer}
      />
    </Box>
  );
}
