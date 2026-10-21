import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import { Box, Button, Skeleton, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router';
import { popIn } from '../../../components/animations';
import { easing, fonts, game as palette } from '../../../app/theme';
import type { LeaderboardRankResponse } from '../../../types/leaderboard';

interface Props {
  rank: LeaderboardRankResponse | null;
  loading: boolean;
  error: boolean;
  showAction?: boolean;
  animate?: boolean;
}

// how far up the table the player sits, rounded up so first place reads as top 1%
function topShare(rank: LeaderboardRankResponse) {
  return Math.max(1, Math.ceil((rank.rank / Math.max(rank.totalRanked, 1)) * 100));
}

export default function LeaderboardRankCard({
  rank,
  loading,
  error,
  showAction = true,
  animate = true,
}: Props) {
  const navigate = useNavigate();

  if (error) {
    return null;
  }

  const ranked = !loading && rank?.ranked;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 2,
        p: { xs: 2, sm: 2.25 },
        mb: 3,
        borderRadius: '18px',
        border: 1,
        borderColor: alpha(palette.brand, 0.35),
        background: `linear-gradient(110deg, ${alpha(palette.brand, 0.14)} 0%, ${alpha(palette.brand, 0.03)} 60%)`,
        animation: animate ? `${popIn} 0.5s ${easing.out} 0.3s both` : undefined,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
        <Box
          aria-hidden
          sx={{
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            minWidth: 64,
            height: 64,
            px: 1,
            borderRadius: '14px',
            bgcolor: alpha(palette.night, 0.5),
            border: 1,
            borderColor: alpha(palette.brand, 0.4),
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: '1.9rem',
            color: 'primary.light',
          }}
        >
          {loading ? <Skeleton variant="text" width={36} /> : ranked ? `#${rank!.rank}` : '–'}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              color: 'primary.light',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Your standing
          </Typography>
          {loading ? (
            <Skeleton variant="text" width={160} sx={{ fontSize: '1.4rem' }} />
          ) : (
            <Typography sx={{ fontWeight: 700, fontSize: '1.15rem' }}>
              {ranked
                ? `You're #${rank!.rank.toLocaleString()} of ${rank!.totalRanked.toLocaleString()}`
                : "You're not ranked yet"}
            </Typography>
          )}
          {!loading && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {ranked
                ? `${rank!.quarterWins.toLocaleString()} quarter ${rank!.quarterWins === 1 ? 'win' : 'wins'} all-time`
                : 'Win a quarter in any contest to join the leaderboard.'}
            </Typography>
          )}
        </Box>
      </Box>

      {ranked && (
        <Box
          sx={{
            alignSelf: { xs: 'flex-start', sm: 'center' },
            px: 1.25,
            py: 0.5,
            borderRadius: '8px',
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: '0.95rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: palette.gold,
            bgcolor: alpha(palette.gold, 0.12),
            border: 1,
            borderColor: alpha(palette.gold, 0.4),
          }}
        >
          Top {topShare(rank!)}%
        </Box>
      )}

      {showAction && (
        <Button
          variant="outlined"
          startIcon={<LeaderboardIcon />}
          onClick={() => navigate('/leaderboard')}
          sx={{ flexShrink: 0 }}
        >
          View Leaderboard
        </Button>
      )}
    </Box>
  );
}
