import { Box } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import type { StreamStatus } from '../../../api/eventStream';
import type { ActivityEvent, Contest, Participant } from '../../../types/contest';
import type { ContestViewer } from '../live/viewer';
import ContestDetails from './details/ContestDetails';
import ContestGrid, { type SquarePosition } from './grid/ContestGrid';
import ContestScoreboard from './scoreboard/ContestScoreboard';
import QuarterStrip from './scoreboard/QuarterStrip';
import ActivityFeed from './sidebar/ActivityFeed';

interface Props {
  contest: Contest;
  participants: Participant[];
  activity: ActivityEvent[];
  viewer: ContestViewer;
  status: StreamStatus;
  winnerFlash: SquarePosition | null;
  onStale: () => void;
}

// the contest page: the broadcast header and quarter strip, then the board beside its panels
export default function ContestView({
  contest,
  participants,
  activity,
  viewer,
  status,
  winnerFlash,
  onStale,
}: Props) {
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
        participants={participants}
        viewer={viewer}
        status={status}
        onRetry={onStale}
      />

      <QuarterStrip contest={contest} viewer={viewer} />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'auto minmax(0, 1fr)' },
          gap: { xs: 2, sm: 2.5 },
          alignItems: 'start',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', minWidth: 0 }}>
          <ContestGrid
            contest={contest}
            viewer={viewer}
            winnerFlash={winnerFlash}
            onStale={onStale}
          />
        </Box>

        <Box sx={{ display: 'grid', gap: { xs: 2, sm: 2.5 }, minWidth: 0 }}>
          <ContestDetails contest={contest} viewer={viewer} />
          <ActivityFeed events={activity} />
        </Box>
      </Box>
    </Box>
  );
}
