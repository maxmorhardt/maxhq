import { Box, Skeleton } from '@mui/material';

// placeholder rows shown on first load; the widths vary so the block does not read as a striped box
const NAME_WIDTHS = [104, 132, 88, 118];

export default function LeaderboardTableSkeleton() {
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: '18px', overflow: 'hidden' }}>
      <Box sx={{ height: 40, borderBottom: 1, borderColor: 'divider' }} />
      {NAME_WIDTHS.map((width, i) => (
        <Box
          key={width}
          data-testid="leaderboard-row-skeleton"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 2,
            py: 1.5,
            borderBottom: i < NAME_WIDTHS.length - 1 ? 1 : 0,
            borderColor: 'divider',
            // the rows fade out down the stack so the list reads as continuing past the fold
            opacity: 1 - i * 0.18,
          }}
        >
          <Skeleton variant="text" width={18} sx={{ fontSize: '1.2rem' }} />
          <Skeleton
            variant="circular"
            width={32}
            height={32}
            sx={{ flexShrink: 0, display: { xs: 'none', sm: 'block' } }}
          />
          <Skeleton variant="text" width={width} sx={{ maxWidth: '40%', fontSize: '1rem' }} />
          <Skeleton
            variant="rounded"
            width={110}
            height={6}
            sx={{ ml: 'auto', display: { xs: 'none', sm: 'block' } }}
          />
          <Skeleton
            variant="text"
            width={24}
            sx={{ ml: { xs: 'auto', sm: 0 }, fontSize: '1.2rem' }}
          />
          <Skeleton
            variant="text"
            width={34}
            sx={{ fontSize: '1rem', display: { xs: 'none', sm: 'block' } }}
          />
        </Box>
      ))}
    </Box>
  );
}
