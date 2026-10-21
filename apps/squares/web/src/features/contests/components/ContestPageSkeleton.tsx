import { Box, Skeleton } from '@mui/material';

const card = { borderRadius: '18px' };

// mirrors ContestView: the scoreboard header, the quarter strip, then the board beside its panels
export default function ContestPageSkeleton() {
  return (
    <Box
      data-testid="contest-skeleton"
      sx={{
        width: '100%',
        maxWidth: 1240,
        mx: 'auto',
        px: { xs: 1, sm: 2 },
        pt: { xs: 2, sm: 3 },
        pb: 5,
        display: 'grid',
        gap: { xs: 2, sm: 2.5 },
      }}
    >
      <Skeleton variant="rounded" height={190} sx={card} />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 1.25,
        }}
      >
        {[1, 2, 3, 4].map((q) => (
          <Skeleton key={q} variant="rounded" height={104} sx={card} />
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'auto minmax(0, 1fr)' },
          gap: { xs: 2, sm: 2.5 },
        }}
      >
        <Skeleton
          variant="rounded"
          sx={{
            ...card,
            width: { xs: '100%', sm: 640, md: 720 },
            height: { xs: 380, sm: 640, md: 720 },
            mx: 'auto',
          }}
        />
        <Box sx={{ display: 'grid', gap: { xs: 2, sm: 2.5 }, alignContent: 'start' }}>
          <Skeleton variant="rounded" height={240} sx={card} />
          <Skeleton variant="rounded" height={320} sx={card} />
        </Box>
      </Box>
    </Box>
  );
}
