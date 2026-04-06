import { Box, Paper, Skeleton } from '@mui/material';
import type { ConnectionStatus } from '../../types/ws';
import ConnectionChip from './ConnectionChip';

interface ContestPageSkeletonProps {
  connectionStatus?: ConnectionStatus;
  retryCount?: number;
}

export default function ContestPageSkeleton({
  connectionStatus = 'connecting',
  retryCount = 0,
}: ContestPageSkeletonProps) {
  const cardSx = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 2.5,
    p: 1.5,
  };

  return (
    <Box sx={{ textAlign: 'center', position: 'relative' }}>
      {/* title skeleton */}
      <Box sx={{ mt: 2, mb: 1, display: 'flex', justifyContent: 'center' }}>
        <Skeleton
          variant="text"
          sx={{
            fontSize: { xs: '1rem', sm: '1.5rem' },
            width: { xs: 120, sm: 240 },
            height: { xs: 24, sm: 36 },
          }}
        />
      </Box>

      {/* connection status chip */}
      <ConnectionChip status={connectionStatus} retryCount={retryCount} />

      {/* three-column layout: left sidebar, center grid, right sidebar */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 3,
          width: '100%',
          maxWidth: '1600px',
          margin: '0 auto',
          alignItems: { xs: 'center', lg: 'flex-start' },
          justifyContent: 'center',
          p: 1,
        }}
      >
        {/* left sidebar: winners board + activity feed (desktop only) */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            flexDirection: 'column',
            gap: 1.5,
            flex: '0 0 280px',
          }}
        >
          {/* winners board skeleton */}
          <Paper sx={cardSx}>
            <Skeleton variant="text" width={130} height={28} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" height={4} sx={{ borderRadius: 1, mb: 1 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={44} sx={{ borderRadius: 1 }} />
              ))}
            </Box>
          </Paper>

          {/* activity feed skeleton */}
          <Paper sx={cardSx}>
            <Skeleton variant="text" width={110} height={28} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" height={4} sx={{ borderRadius: 1, mb: 1 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={36} sx={{ borderRadius: 1 }} />
              ))}
            </Box>
          </Paper>
        </Box>

        {/* center: contest grid skeleton */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            flex: { xs: '1 1 auto', lg: '0 0 auto' },
          }}
        >
          <Paper
            sx={{
              ...cardSx,
              p: { xs: 2.25, sm: 3, md: 4 },
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(11, 1fr)',
                gridTemplateRows: 'repeat(11, 1fr)',
                gap: { xs: 0.5, sm: 1 },
                width: { xs: '320px', sm: '440px', md: '550px' },
                height: { xs: '320px', sm: '440px', md: '550px' },
              }}
            >
              {[...Array(121)].map((_, index) => (
                <Skeleton
                  key={index}
                  variant="rectangular"
                  sx={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 1,
                  }}
                />
              ))}
            </Box>
          </Paper>
        </Box>

        {/* right sidebar: contest details + live chat (desktop only) */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            flexDirection: 'column',
            gap: 1.5,
            flex: '0 0 280px',
          }}
        >
          {/* contest details skeleton */}
          <Paper sx={cardSx}>
            <Skeleton variant="text" width={120} height={28} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" height={4} sx={{ borderRadius: 1, mb: 1 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              <Skeleton variant="rectangular" height={36} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
            </Box>
          </Paper>

          {/* live chat skeleton */}
          <Paper sx={cardSx}>
            <Skeleton variant="text" width={90} height={28} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" height={4} sx={{ borderRadius: 1, mb: 1 }} />
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1, mb: 1.5 }} />
            <Skeleton variant="rectangular" height={36} sx={{ borderRadius: 2 }} />
          </Paper>
        </Box>
      </Box>

      {/* mobile: sidebars underneath contest grid */}
      <Box
        sx={{
          display: { xs: 'flex', lg: 'none' },
          flexDirection: 'column',
          gap: 3,
          width: '100%',
          maxWidth: { xs: '360px', sm: '490px', md: '600px' },
          margin: '0 auto',
          p: 1,
          mb: 3,
          mt: 2,
        }}
      >
        {/* contest details skeleton */}
        <Paper sx={cardSx}>
          <Skeleton variant="text" width={120} height={28} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" height={4} sx={{ borderRadius: 1, mb: 1 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            <Skeleton variant="rectangular" height={36} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
          </Box>
        </Paper>

        {/* winners board skeleton */}
        <Paper sx={cardSx}>
          <Skeleton variant="text" width={130} height={28} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" height={4} sx={{ borderRadius: 1, mb: 1 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={44} sx={{ borderRadius: 1 }} />
            ))}
          </Box>
        </Paper>

        {/* activity feed skeleton */}
        <Paper sx={cardSx}>
          <Skeleton variant="text" width={110} height={28} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" height={4} sx={{ borderRadius: 1, mb: 1 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={36} sx={{ borderRadius: 1 }} />
            ))}
          </Box>
        </Paper>

        {/* live chat skeleton */}
        <Paper sx={cardSx}>
          <Skeleton variant="text" width={90} height={28} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" height={4} sx={{ borderRadius: 1, mb: 1 }} />
          <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 1, mb: 1.5 }} />
          <Skeleton variant="rectangular" height={36} sx={{ borderRadius: 2 }} />
        </Paper>
      </Box>
    </Box>
  );
}
