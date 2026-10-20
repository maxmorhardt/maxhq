import { Box, Paper, Skeleton, useTheme } from '@mui/material';

const cardSx = { p: 2, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' };

function SettingRowSkeleton({ danger = false }: { danger?: boolean }) {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        ...cardSx,
        mb: danger ? 0 : 2.5,
        borderColor: danger ? `${theme.palette.error.main}55` : undefined,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <Box sx={{ flex: 1, width: '100%' }}>
        <Skeleton variant="text" width={140} sx={{ fontSize: '1.1rem' }} />
        <Skeleton variant="text" width="85%" />
      </Box>
      <Skeleton variant="rounded" width={danger ? 150 : 72} height={36} />
    </Paper>
  );
}

export default function ProfileSkeleton() {
  return (
    <Box data-testid="profile-skeleton">
      <Box sx={{ textAlign: 'center', mb: 2.5 }}>
        <Skeleton variant="circular" width={60} height={60} sx={{ mx: 'auto', mb: 1 }} />
        <Skeleton variant="text" width={180} sx={{ mx: 'auto', fontSize: '1.5rem' }} />
        <Skeleton variant="text" width={220} sx={{ mx: 'auto' }} />
        <Skeleton variant="text" width={140} sx={{ mx: 'auto' }} />
      </Box>

      <Skeleton variant="text" width={130} sx={{ mx: 'auto', mb: 1.25, fontSize: '1.1rem' }} />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
          gap: 1.5,
          mb: 2.5,
        }}
      >
        {Array.from({ length: 4 }, (_, i) => (
          <Paper key={i} elevation={0} sx={{ ...cardSx, py: 1.75, textAlign: 'center' }}>
            <Skeleton variant="circular" width={26} height={26} sx={{ mx: 'auto', mb: 0.5 }} />
            <Skeleton variant="text" width={60} sx={{ mx: 'auto', fontSize: '1.75rem' }} />
            <Skeleton variant="text" width={110} sx={{ mx: 'auto' }} />
          </Paper>
        ))}
      </Box>

      <Paper elevation={0} sx={{ ...cardSx, mb: 2.5 }}>
        <Skeleton variant="text" width={160} sx={{ fontSize: '1.5rem' }} />
        <Skeleton variant="text" width="60%" />
      </Paper>

      <SettingRowSkeleton />
      <SettingRowSkeleton danger />
    </Box>
  );
}
