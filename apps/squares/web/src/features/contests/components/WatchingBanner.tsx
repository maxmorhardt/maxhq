import { VisibilityOutlined } from '@mui/icons-material';
import { Box, Typography } from '@mui/material';
import type { Contest } from '../../../types/contest';
import { isTerminalStatus } from '../../../utils/contestStatus';
import type { ContestViewer } from '../live/viewer';
import { WATCHING_MESSAGE } from '../watching';

interface Props {
  contest: Contest;
  viewer: ContestViewer;
}

export default function WatchingBanner({ contest, viewer }: Props) {
  if (viewer.isOwner || viewer.isPlayer || isTerminalStatus(contest.status)) {
    return null;
  }

  return (
    <Box
      role="status"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        px: 2,
        py: 1.5,
        borderRadius: '12px',
        border: 1,
        borderColor: 'primary.main',
        bgcolor: 'rgba(90, 169, 255, 0.08)',
      }}
    >
      <VisibilityOutlined sx={{ color: 'primary.main', flexShrink: 0 }} />
      <Typography sx={{ fontSize: '0.9rem', lineHeight: 1.45 }}>{WATCHING_MESSAGE}</Typography>
    </Box>
  );
}
