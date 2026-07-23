import { Box, Paper, Skeleton } from '@mui/material';
import { GRID_COLUMNS, ROW_GAP } from './leaderboardLayout';

// placeholder rows shown on first load; the widths vary so the block does not read as a striped box
const NAME_WIDTHS = [104, 132, 88, 118];

export default function LeaderboardTableSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: ROW_GAP }}>
      {NAME_WIDTHS.map((width, i) => (
        <Paper
          key={width}
          elevation={0}
          sx={{
            display: 'grid',
            gridTemplateColumns: GRID_COLUMNS,
            alignItems: 'center',
            gap: 1,
            px: 2.5,
            py: 1.35,
            borderRadius: 2.5,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            // the rows fade out down the stack so the list reads as continuing past the fold
            opacity: 1 - i * 0.18,
          }}
        >
          <Skeleton variant="text" width={14} sx={{ fontSize: '1rem' }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
            <Skeleton
              variant="circular"
              width={30}
              height={30}
              sx={{ flexShrink: 0, display: { xs: 'none', sm: 'block' } }}
            />
            <Skeleton variant="text" width={width} sx={{ maxWidth: '100%', fontSize: '1rem' }} />
          </Box>

          <Skeleton variant="text" width={26} sx={{ ml: 'auto', fontSize: '1rem' }} />

          <Skeleton
            variant="text"
            width={30}
            sx={{ ml: 'auto', fontSize: '1rem', display: { xs: 'none', sm: 'block' } }}
          />

          <Skeleton
            variant="text"
            width={34}
            sx={{ ml: 'auto', fontSize: '1rem', display: { xs: 'none', sm: 'block' } }}
          />
        </Paper>
      ))}
    </Box>
  );
}
