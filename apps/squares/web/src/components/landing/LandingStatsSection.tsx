import { EmojiEvents, GridOn, TrendingUp } from '@mui/icons-material';
import { Box, Container, Skeleton, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { selectStats, selectStatsLoading } from '../../features/stats/statsSelectors';
import { fetchStats } from '../../features/stats/statsThunks';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';

interface StatItemProps {
  icon: ReactNode;
  value: number | undefined;
  label: string;
  loading: boolean;
  delay: string;
  visible: boolean;
}

function StatItem({ icon, value, label, loading, delay, visible }: StatItemProps) {
  return (
    <Box
      className={`scroll-pop-in ${delay} ${visible ? 'visible' : ''}`}
      sx={{
        textAlign: 'center',
        px: 3,
        py: 4,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          mb: 2,
          color: 'primary.main',
          fontSize: 44,
        }}
      >
        {icon}
      </Box>
      {loading ? (
        <Skeleton variant="text" width={80} sx={{ mx: 'auto', fontSize: '2.5rem' }} />
      ) : (
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            color: 'text.primary',
            mb: 1,
          }}
        >
          {value?.toLocaleString() ?? '—'}
        </Typography>
      )}
      <Typography
        variant="body1"
        sx={{
          color: 'text.secondary',
          fontWeight: 500,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

export default function LandingStatsSection() {
  const dispatch = useAppDispatch();
  const stats = useAppSelector(selectStats);
  const loading = useAppSelector(selectStatsLoading);
  const { ref, isVisible } = useScrollAnimation();

  useEffect(() => {
    dispatch(fetchStats());
  }, [dispatch]);

  return (
    <Container maxWidth="lg" sx={{ mb: 14 }}>
      <Box ref={ref} sx={{ textAlign: 'center' }}>
        <Typography
          variant="h3"
          className={`scroll-pop-in ${isVisible ? 'visible' : ''}`}
          sx={{
            fontWeight: 700,
            mb: 2,
            color: 'text.primary',
          }}
        >
          By the Numbers
        </Typography>
        <Typography
          variant="h6"
          className={`scroll-pop-in ${isVisible ? 'visible' : ''}`}
          sx={{
            color: 'text.secondary',
            mb: 6,
            maxWidth: 600,
            mx: 'auto',
            fontWeight: 400,
          }}
        >
          See what the community is up to today
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
            gap: { xs: 2, md: 4 },
          }}
        >
          <StatItem
            icon={<GridOn sx={{ fontSize: 'inherit' }} />}
            value={stats?.contestsCreatedToday}
            label="Contests Created Today"
            loading={loading}
            delay=""
            visible={isVisible}
          />
          <StatItem
            icon={<EmojiEvents sx={{ fontSize: 'inherit' }} />}
            value={stats?.squaresClaimedToday}
            label="Squares Claimed Today"
            loading={loading}
            delay="delay-1"
            visible={isVisible}
          />
          <StatItem
            icon={<TrendingUp sx={{ fontSize: 'inherit' }} />}
            value={stats?.totalActiveContests}
            label="Active Contests"
            loading={loading}
            delay="delay-2"
            visible={isVisible}
          />
        </Box>
      </Box>
    </Container>
  );
}
