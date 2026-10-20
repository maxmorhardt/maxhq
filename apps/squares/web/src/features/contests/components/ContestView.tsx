import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import type { StreamStatus } from '../../../api/eventStream';
import type { ActivityEvent, Contest, Participant } from '../../../types/contest';
import { CONTEST_STACK_MAX_WIDTH } from '../../../types/layout';
import type { ContestViewer } from '../live/viewer';
import ConnectionStatus from './ConnectionStatus';
import ContestDetails from './details/ContestDetails';
import ContestGrid, { type SquarePosition } from './grid/ContestGrid';
import ActivityFeed from './sidebar/ActivityFeed';
import WinnersBoard from './sidebar/WinnersBoard';

interface Props {
  contest: Contest;
  participants: Participant[];
  activity: ActivityEvent[];
  viewer: ContestViewer;
  status: StreamStatus;
  winnerFlash: SquarePosition | null;
  onStale: () => void;
}

// the contest page layout: grid in the middle, sidebars beside it on desktop and below it on mobile
export default function ContestView({
  contest,
  participants,
  activity,
  viewer,
  status,
  winnerFlash,
  onStale,
}: Props) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'), { noSsr: true });

  const grid = (
    <ContestGrid contest={contest} viewer={viewer} winnerFlash={winnerFlash} onStale={onStale} />
  );
  const details = (
    <ContestDetails
      contest={contest}
      participants={participants}
      viewer={viewer}
      fillHeight={isDesktop}
    />
  );
  const winners = <WinnersBoard contest={contest} viewer={viewer} />;
  const feed = <ActivityFeed events={activity} />;

  return (
    <Box sx={{ textAlign: 'center', position: 'relative' }}>
      <Helmet>
        <title>{`${contest.name} – Squares`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* contest name and connection state */}
      <Box sx={{ mt: { xs: 1.5, sm: 2 }, mb: { xs: 0.5, sm: 1 }, px: 5 }}>
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: '1rem', sm: '1.5rem', md: '1.7rem' },
            fontWeight: 800,
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {contest.name}
        </Typography>
        <ConnectionStatus status={status} onRetry={onStale} />
      </Box>

      {isDesktop ? (
        <Box
          sx={{
            display: 'flex',
            gap: 3,
            maxWidth: 1600,
            mx: 'auto',
            alignItems: 'flex-start',
            justifyContent: 'center',
            p: 1,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: '0 0 280px' }}>
            {winners}
            {feed}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>{grid}</Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              flex: '0 0 280px',
              alignSelf: 'stretch',
            }}
          >
            {details}
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            width: '100%',
            maxWidth: CONTEST_STACK_MAX_WIDTH,
            mx: 'auto',
            p: 1,
            mb: 3,
          }}
        >
          {grid}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', mt: 2 }}>
            {details}
            {winners}
            {feed}
          </Box>
        </Box>
      )}
    </Box>
  );
}
