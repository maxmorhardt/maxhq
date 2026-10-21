import { Box, Skeleton } from '@mui/material';

// placeholder bars shown on first load, shorter down the list as the real ones would be
const REACH = [92, 74, 58, 41];

export default function LeaderboardTableSkeleton() {
  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      {REACH.map((reach, i) => (
        <Box
          key={reach}
          data-testid="leaderboard-row-skeleton"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '36px minmax(0, 1fr)', sm: '44px minmax(0, 1fr) 76px 76px' },
            alignItems: 'center',
            gap: 1.5,
            px: 0.5,
            // the rows fade out down the stack so the list reads as continuing past the fold
            opacity: 1 - i * 0.18,
          }}
        >
          <Skeleton variant="text" width={20} sx={{ mx: 'auto', fontSize: '1.3rem' }} />
          <Skeleton
            variant="rounded"
            width={`${reach}%`}
            height={48}
            sx={{ borderRadius: '12px' }}
          />
          <Skeleton
            variant="text"
            width={30}
            sx={{ ml: 'auto', display: { xs: 'none', sm: 'block' } }}
          />
          <Skeleton
            variant="text"
            width={34}
            sx={{ ml: 'auto', display: { xs: 'none', sm: 'block' } }}
          />
        </Box>
      ))}
    </Box>
  );
}
