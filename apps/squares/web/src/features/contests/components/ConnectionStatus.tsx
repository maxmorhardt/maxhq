import { CloudOff, Sync } from '@mui/icons-material';
import { Box, Button, Chip } from '@mui/material';
import type { StreamStatus } from '../../../api/eventStream';

interface Props {
  status: StreamStatus;
  onRetry: () => void;
}

// stays out of the way while live; says so when updates have paused
export default function ConnectionStatus({ status, onRetry }: Props) {
  if (status === 'live' || status === 'connecting') {
    return null;
  }

  const failed = status === 'failed';

  return (
    <Box
      role="status"
      sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 0.5 }}
    >
      <Chip
        size="small"
        icon={failed ? <CloudOff /> : <Sync />}
        label={failed ? 'Live updates paused' : 'Reconnecting…'}
        color={failed ? 'warning' : 'default'}
        variant="outlined"
      />
      {failed && (
        <Button size="small" onClick={onRetry}>
          Retry
        </Button>
      )}
    </Box>
  );
}
