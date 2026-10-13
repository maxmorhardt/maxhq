import { Box, Paper, Skeleton } from '@mui/material';
import { CONTEST_STACK_MAX_WIDTH } from '../../types/layout';

export default function ContestPageSkeleton() {
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
              p: { xs: 0.75, sm: 1, md: 1.5 },
              borderRadius: 3,
              width: 'fit-content',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              {/* away team label */}
              <Skeleton
                variant="rectangular"
                sx={{
                  width: { xs: 70, sm: 90, md: 110 },
                  height: { xs: 10, sm: 14, md: 16 },
                  borderRadius: 0.5,
                  mb: { xs: 2, sm: 3.375 },
                }}
              />

              <Box sx={{ display: 'flex', alignItems: 'center', pb: { xs: 1.5, sm: 3.5 } }}>
                {/* home team label (vertical) */}
                <Skeleton
                  variant="rectangular"
                  sx={{
                    width: { xs: 16, sm: 19, md: 23 },
                    height: { xs: 100, sm: 130, md: 150 },
                    borderRadius: 1,
                    mr: { xs: 2, sm: 3.5 },
                  }}
                />

                {/* grid rows */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    pr: { xs: 3.5, sm: 5 },
                  }}
                >
                  {[...Array(10)].map((_, rowIndex) => (
                    <Box key={rowIndex} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {[...Array(10)].map((_, colIndex) => (
                        <Box key={colIndex} sx={{ position: 'relative' }}>
                          {rowIndex === 0 && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: { xs: -12, sm: -18, md: -20 },
                                left: '50%',
                                transform: 'translateX(-50%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: { xs: 8, sm: 12, md: 14 },
                                height: { xs: 8, sm: 12, md: 14 },
                              }}
                            >
                              <Skeleton
                                variant="rectangular"
                                sx={{ width: { xs: 5, sm: 7, md: 8 }, height: 2, borderRadius: 1 }}
                              />
                            </Box>
                          )}
                          {colIndex === 0 && (
                            <Box
                              sx={{
                                position: 'absolute',
                                left: { xs: -10, sm: -13, md: -16 },
                                top: '50%',
                                transform: 'translateY(-50%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: { xs: 8, sm: 12, md: 14 },
                                height: { xs: 8, sm: 12, md: 14 },
                              }}
                            >
                              <Skeleton
                                variant="rectangular"
                                sx={{ width: { xs: 5, sm: 7, md: 8 }, height: 2, borderRadius: 1 }}
                              />
                            </Box>
                          )}
                          <Skeleton
                            variant="rectangular"
                            sx={{
                              width: { xs: 24, sm: 42, md: 47 },
                              height: { xs: 24, sm: 42, md: 47 },
                              m: { xs: 0, sm: 0.3, md: 0.4 },
                              borderRadius: 1.5,
                            }}
                          />
                        </Box>
                      ))}
                    </Box>
                  ))}
                </Box>
              </Box>
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
          maxWidth: CONTEST_STACK_MAX_WIDTH,
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
