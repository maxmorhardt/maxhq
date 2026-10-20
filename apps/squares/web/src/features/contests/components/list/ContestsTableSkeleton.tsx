import { Box, Skeleton } from '@mui/material';

interface ContestsTableSkeletonProps {
  rowCount?: number;
}

// mirrors the contest rows: team badges, the name, the fill bar, and the badges
export default function ContestsTableSkeleton({ rowCount = 2 }: ContestsTableSkeletonProps) {
  return (
    <Box sx={{ display: 'grid', gap: 1.25 }}>
      {Array.from({ length: rowCount }, (_, i) => (
        <Box
          key={i}
          data-testid="contest-row-skeleton"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            borderRadius: '16px',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Skeleton variant="rounded" width={64} height={36} sx={{ borderRadius: '10px' }} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="25%" />
          </Box>
          <Skeleton
            variant="rounded"
            width={140}
            height={8}
            sx={{ display: { xs: 'none', md: 'block' } }}
          />
          <Skeleton variant="rounded" width={72} height={24} />
        </Box>
      ))}
    </Box>
  );
}
