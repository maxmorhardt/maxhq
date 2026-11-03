import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { Box, IconButton, Skeleton, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { fonts } from '../../../app/theme';
import type { ScoreboardWeek } from '../../../types/contest';

interface Props {
  label: string;
  detail?: ReactNode;
  previous?: ScoreboardWeek;
  next?: ScoreboardWeek;
  onWeek: (week: ScoreboardWeek) => void;
  disabled?: boolean;
  compact?: boolean;
}

const barSx = (compact: boolean) =>
  ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: compact ? 1 : 2,
    mb: compact ? 2 : 3,
    p: compact ? 0.75 : 1,
    borderRadius: '14px',
    border: 1,
    borderColor: 'divider',
    bgcolor: compact ? 'background.default' : 'background.paper',
  }) as const;

export function WeekBarSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Box sx={barSx(compact)}>
      <Skeleton variant="circular" width={40} height={40} />
      <Box sx={{ display: 'grid', justifyItems: 'center', gap: 0.75 }}>
        <Skeleton variant="text" width={120} height={compact ? 24 : 28} />
        <Skeleton variant="text" width={80} height={18} />
      </Box>
      <Skeleton variant="circular" width={40} height={40} />
    </Box>
  );
}

// the week being shown, with steps to the calendar weeks either side
export default function WeekBar({
  label,
  detail,
  previous,
  next,
  onWeek,
  disabled = false,
  compact = false,
}: Props) {
  return (
    <Box sx={barSx(compact)}>
      <IconButton
        aria-label="Previous week"
        onClick={() => previous && onWeek(previous)}
        disabled={!previous || disabled}
      >
        <ChevronLeft />
      </IconButton>
      <Box sx={{ textAlign: 'center', minWidth: 0 }}>
        <Typography
          component={compact ? 'h3' : 'h2'}
          sx={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: compact ? '1.25rem' : '1.5rem',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}
        >
          {label || 'This Week'}
        </Typography>
        {detail && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 1,
              mt: compact ? 0.5 : 0.75,
              color: 'text.secondary',
              fontSize: compact ? '0.8rem' : '0.85rem',
            }}
          >
            {detail}
          </Box>
        )}
      </Box>
      <IconButton
        aria-label="Next week"
        onClick={() => next && onWeek(next)}
        disabled={!next || disabled}
      >
        <ChevronRight />
      </IconButton>
    </Box>
  );
}
