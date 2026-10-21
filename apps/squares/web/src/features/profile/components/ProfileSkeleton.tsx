import { Box, Skeleton } from '@mui/material';

const cardSx = { borderRadius: '18px', border: 1, borderColor: 'divider' } as const;

// mirrors the profile: the ID card beside the career tiles, the standing, and the account row
export default function ProfileSkeleton() {
  return (
    <Box
      data-testid="profile-skeleton"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 340px) minmax(0, 1fr)' },
        gap: { xs: 3, md: 4 },
        alignItems: 'start',
      }}
    >
      <Box sx={{ ...cardSx, borderRadius: '22px', overflow: 'hidden' }}>
        <Skeleton variant="rectangular" height={84} />
        <Box sx={{ px: 3, pb: 3 }}>
          <Skeleton
            variant="rounded"
            width={88}
            height={88}
            sx={{ mt: '-44px', borderRadius: '22px' }}
          />
          <Skeleton variant="text" width="70%" sx={{ mt: 2, fontSize: '2.2rem' }} />
          <Skeleton variant="text" width="60%" />
          <Box
            data-testid="setting-skeleton"
            sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}
          >
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Skeleton variant="rounded" width={64} height={64} sx={{ borderRadius: '12px' }} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="90%" />
              </Box>
            </Box>
            <Skeleton variant="rounded" height={36} sx={{ mt: 2 }} />
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gap: 3.5 }}>
        <Box>
          <Skeleton variant="text" width={80} sx={{ mb: 1.25 }} />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, minmax(0, 1fr))' },
              gap: 1.5,
            }}
          >
            {Array.from({ length: 4 }, (_, i) => (
              <Box key={i} data-testid="stat-skeleton" sx={{ ...cardSx, p: 2.5 }}>
                <Skeleton variant="circular" width={44} height={44} />
                <Skeleton variant="text" width={56} sx={{ mt: 1.5, fontSize: '2.6rem' }} />
                <Skeleton variant="text" width={110} />
              </Box>
            ))}
          </Box>
        </Box>
        <Skeleton variant="rounded" height={104} sx={{ borderRadius: '16px' }} />
        <Box
          data-testid="setting-skeleton"
          sx={{ ...cardSx, p: 2.5, display: 'flex', gap: 2, alignItems: 'center' }}
        >
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width={140} />
            <Skeleton variant="text" width="85%" />
          </Box>
          <Skeleton variant="rounded" width={150} height={36} />
        </Box>
      </Box>
    </Box>
  );
}
