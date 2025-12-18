import { Box, Paper, Skeleton } from '@mui/material';

export default function ContestPageSkeleton() {
  return (
    <Box sx={{ textAlign: 'center', position: 'relative' }}>
      {/* Title Skeleton */}
      <Box sx={{ mt: 2, mb: 1, display: 'flex', justifyContent: 'center' }}>
        <Skeleton variant="text" width={300} height={48} sx={{ fontSize: '2rem' }} />
      </Box>

      {/* Status Chip Skeleton */}
      <Skeleton
        variant="rounded"
        width={60}
        height={24}
        sx={{
          position: 'absolute',
          top: 0,
          right: 14,
        }}
      />

      {/* Three-column layout */}
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
        {/* Left Sidebar Skeleton */}
        <Box sx={{ display: { xs: 'none', lg: 'block' }, flex: '0 0 280px' }}>
          <Paper
            sx={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 3,
              p: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            <Skeleton variant="text" width={150} height={32} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
          </Paper>
        </Box>

        {/* Center - Contest Grid Skeleton */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            flex: { xs: '1 1 auto', lg: '0 0 auto' },
          }}
        >
          <Paper
            sx={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 3,
              p: { xs: 2.25, sm: 3, md: 4 },
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
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

        {/* Right Sidebar Skeletons */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            flexDirection: 'column',
            gap: 3,
            flex: '0 0 280px',
          }}
        >
          {/* Winners Board Skeleton */}
          <Paper
            sx={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 3,
              p: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            <Skeleton variant="text" width={150} height={32} sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {[...Array(4)].map((_, index) => (
                <Skeleton
                  key={index}
                  variant="rectangular"
                  height={60}
                  sx={{ borderRadius: 1.5 }}
                />
              ))}
            </Box>
          </Paper>

          {/* Contest Controls Skeleton */}
          <Paper
            sx={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 3,
              p: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            <Skeleton variant="text" width={150} height={32} sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Mobile: Sidebars underneath contest grid */}
      <Box
        sx={{
          display: { xs: 'flex', lg: 'none' },
          flexDirection: 'column',
          gap: 3,
          width: '100%',
          maxWidth: { xs: '360px', sm: '490px', md: '600px' },
          margin: '0 auto',
          p: 1,
          mb: 2,
        }}
      >
        {/* How to Play Skeleton */}
        <Paper
          sx={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
            p: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <Skeleton variant="text" width={150} height={32} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
        </Paper>

        {/* Winners Board Skeleton */}
        <Paper
          sx={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
            p: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <Skeleton variant="text" width={150} height={32} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[...Array(4)].map((_, index) => (
              <Skeleton key={index} variant="rectangular" height={60} sx={{ borderRadius: 1.5 }} />
            ))}
          </Box>
        </Paper>

        {/* Contest Controls Skeleton */}
        <Paper
          sx={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
            p: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <Skeleton variant="text" width={150} height={32} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
