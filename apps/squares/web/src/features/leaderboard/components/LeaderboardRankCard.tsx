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

// the notches where a ticket tears, punched out of the card in the page color
const notch = (side: 'top' | 'bottom') => ({
  content: '""',
  position: 'absolute',
  left: -9,
  [side]: -9,
  width: 18,
  height: 18,
  borderRadius: '50%',
  bgcolor: 'background.default',
  border: 1,
  borderColor: alpha(palette.gold, 0.35),
});

// the player's place on the board, drawn as a ticket stub
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
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr)',
        borderRadius: '16px',
        border: 1,
        borderColor: alpha(palette.gold, 0.35),
        background: `linear-gradient(120deg, ${alpha(palette.gold, 0.1)}, ${alpha(palette.gold, 0.02)} 55%), ${palette.field}`,
        overflow: 'hidden',
        animation: animate ? `${popIn} 0.5s ${easing.out} 0.2s both` : undefined,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      {/* the stub: the rank, big */}
      <Box
        aria-hidden
        sx={{
          display: 'grid',
          placeItems: 'center',
          minWidth: { xs: 92, sm: 112 },
          px: 2,
          borderRight: 2,
          borderRightStyle: 'dashed',
          borderColor: alpha(palette.gold, 0.35),
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: { xs: '2.4rem', sm: '3rem' },
          lineHeight: 1,
          color: palette.gold,
        }}
      >
        {loading ? <Skeleton variant="text" width={48} /> : ranked ? `#${rank!.rank}` : '–'}
      </Box>

      <Box
        sx={{
          position: 'relative',
          p: { xs: 2, sm: 2.5 },
          display: 'grid',
          gap: 0.5,
          '&::before': notch('top'),
          '&::after': notch('bottom'),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography
            sx={{
              color: palette.gold,
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            Your standing
          </Typography>
          {ranked && (
            <Box
              component="span"
              sx={{
                px: 0.9,
                borderRadius: '6px',
                fontFamily: fonts.display,
                fontWeight: 700,
                fontSize: '0.85rem',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: palette.night,
                bgcolor: palette.gold,
              }}
            >
              Top {topShare(rank!)}%
            </Box>
          )}
        </Box>

        {loading ? (
          <Skeleton variant="text" width={180} sx={{ fontSize: '1.4rem' }} />
        ) : (
          <Typography sx={{ fontWeight: 700, fontSize: '1.2rem' }}>
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

        {showAction && (
          <Button
            size="small"
            startIcon={<LeaderboardIcon />}
            onClick={() => navigate('/leaderboard')}
            sx={{ justifySelf: 'start', mt: 1, ml: -1, color: palette.gold }}
          >
            View Leaderboard
          </Button>
        )}
      </Box>
    </Box>
  );
}
