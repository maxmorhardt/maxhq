import { Chip } from '@mui/material';
import type { ConnectionStatus } from '../../types/ws';

interface ConnectionChipProps {
  status: ConnectionStatus;
  retryCount?: number;
}

export default function ConnectionChip({ status, retryCount = 0 }: ConnectionChipProps) {
  const label = (() => {
    switch (status) {
      case 'connected':
        return 'Live';
      case 'reconnecting':
        return `Reconnecting (${retryCount})`;
      case 'failed':
        return 'Connection Failed';
      default:
        return 'Connecting';
    }
  })();

  const color = status === 'connected' ? 'success' : status === 'failed' ? 'error' : 'warning';
  const variant = status === 'connected' ? 'filled' : 'outlined';

  return (
    <Chip
      label={label}
      color={color}
      size="small"
      variant={variant}
      sx={{
        position: 'absolute',
        top: { xs: 4, sm: 0 },
        right: { xs: 8, sm: 14 },
      }}
    />
  );
}
