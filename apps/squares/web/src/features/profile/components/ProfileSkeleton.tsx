import { Box, Skeleton } from '@mui/material';

const cardSx = { borderRadius: '18px', border: 1, borderColor: 'divider' } as const;

// mirrors the profile: the player card, the stats strip, the standing, and the settings rows
export default function ProfileSkeleton() {
  return (
    <Box data-testid="profile-skeleton">
      <Box
        sx={{
          ...cardSx,
          borderRadius: '22px',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: { xs: 2, sm: 3 },
          p: { xs: 2.5, sm: 3.5 },
          mb: 3.5,
        }}
      >
        <Skeleton variant="rounded" width={96} height={96} sx={{ borderRadius: '20px' }} />
        <Box sx={{ flex: 1, width: '100%' }}>
          <Skeleton variant="text" width="55%" sx={{ fontSize: '2.6rem' }} />
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="rounded" width={170} height={26} sx={{ mt: 1.25 }} />
        </Box>
      </Box>

      <Skeleton variant="text" width={110} sx={{ mb: 1.25 }} />
      <Box
        sx={{
          ...cardSx,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          mb: 3.5,
        }}
      >
        {Array.from({ length: 4 }, (_, i) => (
          <Box key={i} data-testid="stat-skeleton" sx={{ px: 2.5, py: 2.25 }}>
            <Skeleton variant="text" width={110} />
            <Skeleton variant="text" width={56} sx={{ fontSize: '2.4rem' }} />
          </Box>
        ))}
      </Box>

      <Box sx={{ ...cardSx, display: 'flex', alignItems: 'center', gap: 2, p: 2.25, mb: 3 }}>
        <Skeleton variant="rounded" width={64} height={64} sx={{ borderRadius: '14px' }} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width={90} />
          <Skeleton variant="text" width="45%" sx={{ fontSize: '1.3rem' }} />
        </Box>
      </Box>

      <Skeleton variant="text" width={80} sx={{ mb: 1.25 }} />
      <Box sx={cardSx}>
        {[0, 1].map((row) => (
          <Box
            key={row}
            data-testid="setting-skeleton"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 2.5,
              borderTop: row ? 1 : 0,
              borderColor: 'divider',
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width={140} sx={{ fontSize: '1.1rem' }} />
              <Skeleton variant="text" width="80%" />
            </Box>
            <Skeleton variant="rounded" width={row ? 150 : 72} height={36} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
