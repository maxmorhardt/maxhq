import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import { Box, Button, Paper, Skeleton, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { LeaderboardRankResponse } from '../../types/leaderboard';
import { popIn } from '../profile/animations';

interface Props {
  rank: LeaderboardRankResponse | null;
  loading: boolean;
  error: boolean;
  showAction?: boolean;
}

export default function LeaderboardRankCard({ rank, loading, error, showAction = true }: Props) {
  const theme = useTheme();
  const navigate = useNavigate();

  if (error) {
    return null;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 2.5,
        borderRadius: 3,
        border: `1px solid ${theme.palette.primary.main}44`,
        background: `linear-gradient(135deg, ${theme.palette.primary.dark}22 0%, ${theme.palette.primary.main}11 100%)`,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        gap: 2,
        animation: `${popIn} 0.5s ease-out 0.5s both`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <EmojiEventsIcon sx={{ fontSize: 34, color: 'primary.main' }} />
        <Box>
          {loading ? (
            <Skeleton variant="text" width={160} sx={{ fontSize: '1.5rem' }} />
          ) : rank?.ranked ? (
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              You're #{rank.rank.toLocaleString()} of {rank.totalRanked.toLocaleString()}
            </Typography>
          ) : (
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              You're not ranked yet
            </Typography>
          )}

          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {loading
              ? ''
              : rank?.ranked
                ? `${rank.quarterWins.toLocaleString()} quarter ${rank.quarterWins === 1 ? 'win' : 'wins'} all-time`
                : 'Win a quarter in any contest to join the leaderboard.'}
          </Typography>
        </Box>
      </Box>

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
    </Paper>
  );
}
