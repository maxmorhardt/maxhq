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
      <Skeleton variant="rounded" height={186} sx={card} />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
          gap: 1.25,
        }}
      >
        {[1, 2, 3, 4].map((q) => (
          <Skeleton key={q} variant="rounded" height={108} sx={card} />
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.25fr) minmax(0, 1fr)' },
          gap: { xs: 2, sm: 2.5 },
        }}
      >
        {/* the board is close to square, and like the real one it sets the row height */}
        <Skeleton
          variant="rounded"
          sx={{ ...card, width: '100%', height: 'auto', aspectRatio: '1.04' }}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 2.5 } }}>
          <Skeleton variant="rounded" height={228} sx={card} />
          <Skeleton variant="rounded" sx={{ ...card, flex: 1, minHeight: 320 }} />
        </Box>
      </Box>
    </Box>
  );
}
