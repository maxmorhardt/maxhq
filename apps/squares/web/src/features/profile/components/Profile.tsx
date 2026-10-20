import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GridOnIcon from '@mui/icons-material/GridOn';
import GridViewIcon from '@mui/icons-material/GridView';
import GroupsIcon from '@mui/icons-material/Groups';
import { Alert, Box, Button, Paper, Typography, useTheme } from '@mui/material';
import { useAuth } from 'react-oidc-context';
import LeaderboardRankCard from '../../leaderboard/components/LeaderboardRankCard';
import { useGetMyRankQuery } from '../../leaderboard/api';
import { useGetMyProfileQuery, useGetMyStatsQuery } from '../api';
import { useAccountDeletion } from '../useAccountDeletion';
import DeleteAccountDialog from './DeleteAccountDialog';
import InitialsCard from './InitialsCard';
import ProfileSkeleton from './ProfileSkeleton';
import StatCard from './StatCard';

export default function Profile() {
  const theme = useTheme();
  const auth = useAuth();
  const profile = useGetMyProfileQuery();
  const stats = useGetMyStatsQuery();
  const rank = useGetMyRankQuery();
  const { openDialog, dialogProps } = useAccountDeletion();

  if (profile.isLoading || stats.isLoading || rank.isLoading) {
    return <ProfileSkeleton />;
  }

  const user = profile.data;
  const numbers = stats.data;
  const loadError = profile.isError && !user;

  // the share of quarters the user had a stake in that they won
  const winRate =
    numbers && numbers.quartersPlayed > 0
      ? `${((numbers.quarterWins / numbers.quartersPlayed) * 100).toFixed(0)}% win rate`
      : undefined;

  const memberSince = user
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : '';

  return (
    <>
      {loadError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          We couldn't load your profile. Please try again.
        </Alert>
      )}

      {/* who you are */}
      <Box sx={{ textAlign: 'center', mb: 2.5 }}>
        <Box
          sx={{
            width: 60,
            height: 60,
            mx: 'auto',
            mb: 1,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'white' }}>
            {(user?.displayName?.charAt(0) || '?').toUpperCase()}
          </Typography>
        </Box>
        <Typography component="h1" variant="h6" sx={{ fontWeight: 800 }}>
          {user?.displayName || '–'}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
          {user?.email ?? auth.user?.profile?.email}
        </Typography>
        {memberSince && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            Member since {memberSince}
          </Typography>
        )}
      </Box>

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.25, textAlign: 'center' }}>
        Your Numbers
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
          gap: 1.5,
          mb: 2.5,
        }}
      >
        <StatCard
          icon={<GridOnIcon sx={{ fontSize: 'inherit' }} />}
          value={numbers?.contestsCreated}
          label="Contests Created"
        />
        <StatCard
          icon={<GroupsIcon sx={{ fontSize: 'inherit' }} />}
          value={numbers?.contestsJoined}
          label="Contests Joined"
        />
        <StatCard
          icon={<GridViewIcon sx={{ fontSize: 'inherit' }} />}
          value={numbers?.squaresClaimed}
          label="Squares Claimed"
        />
        <StatCard
          icon={<EmojiEventsIcon sx={{ fontSize: 'inherit' }} />}
          value={numbers?.quarterWins}
          label="Quarter Wins"
          caption={winRate}
          highlight
        />
      </Box>

      <LeaderboardRankCard
        rank={rank.data ?? null}
        loading={false}
        error={rank.isError}
        animate={false}
      />

      <InitialsCard initials={user?.defaultInitials} disabled={loadError} />

      {/* danger zone */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          border: `1px solid ${theme.palette.error.main}55`,
          background: 'rgba(244,67,54,0.05)',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Danger Zone
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Deleting your account anonymizes your contest history and removes your personal data.
            You must delete or leave any active contests first. This cannot be undone.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteForeverIcon />}
          onClick={openDialog}
          disabled={loadError}
          sx={{ flexShrink: 0 }}
        >
          Delete Account
        </Button>
      </Paper>

      <DeleteAccountDialog {...dialogProps} />
    </>
  );
}
