import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GridOnIcon from '@mui/icons-material/GridOn';
import GridViewIcon from '@mui/icons-material/GridView';
import GroupsIcon from '@mui/icons-material/Groups';
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Skeleton,
  Typography,
  useTheme,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../../components/common/LoadingScreen';
import { popIn } from '../../components/profile/animations';
import DeleteAccountDialog from '../../components/profile/DeleteAccountDialog';
import StatCard from '../../components/profile/StatCard';
import { deleteContest, removeContestParticipant } from '../../features/contests/contestThunks';
import { useAppDispatch } from '../../hooks/reduxHooks';
import { useAxiosAuth } from '../../hooks/useAxiosAuth';
import { useToast } from '../../hooks/useToast';
import {
  deleteMyAccount,
  getMyActiveContests,
  getMyProfile,
  getMyStats,
} from '../../service/userService';
import type { UserActiveContest, UserProfile, UserStats } from '../../types/user';
import UnauthorizedPage from '../error/UnauthorizedPage';

export default function ProfilePage() {
  const auth = useAuth();
  const axiosReady = useAxiosAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeContests, setActiveContests] = useState<UserActiveContest[] | null>(null);
  const [activeContestsError, setActiveContestsError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const userEmail = profile?.email ?? auth.user?.profile?.email ?? '';

  const loadProfile = useCallback(async () => {
    setLoadError(false);
    try {
      const [profileRes, statsRes] = await Promise.all([getMyProfile(), getMyStats()]);
      setProfile(profileRes);
      setStats(statsRes);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // wait for the bearer interceptor before fetching, or the first request goes out unauthenticated
  useEffect(() => {
    if (auth.isAuthenticated && axiosReady) {
      loadProfile();
    }
  }, [auth.isAuthenticated, axiosReady, loadProfile]);

  // show redirecting state while a sign-in redirect is in flight instead of flashing the page
  if (auth.activeNavigator === 'signinRedirect') {
    return (
      <LoadingScreen title="Redirecting to sign in..." subtitle="You will be redirected shortly" />
    );
  }

  if (!auth.isLoading && !auth.isAuthenticated) {
    return <UnauthorizedPage />;
  }

  const refreshActiveContests = async () => {
    try {
      const contests = await getMyActiveContests();
      setActiveContests(contests);
      setActiveContestsError(false);
    } catch {
      setActiveContests(null);
      setActiveContestsError(true);
    }
  };

  const openDeleteDialog = () => {
    setActiveContests(null);
    setActiveContestsError(false);
    setActionError(null);
    setDeleteOpen(true);
    refreshActiveContests();
  };

  const closeDeleteDialog = () => {
    setDeleteOpen(false);
    setActiveContests(null);
    setActiveContestsError(false);
    setActionError(null);
  };

  const handleDeleteContest = async (id: string) => {
    setActionError(null);
    setBusyId(id);
    try {
      await dispatch(deleteContest(id)).unwrap();
      await refreshActiveContests();
    } catch {
      setActionError('Failed to delete the contest. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleLeaveContest = async (id: string) => {
    if (!userEmail) {
      setActionError('Unable to determine your email. Please refresh and try again.');
      return;
    }

    setActionError(null);
    setBusyId(id);
    try {
      await dispatch(removeContestParticipant({ contestId: id, userId: userEmail })).unwrap();
      await refreshActiveContests();
    } catch {
      setActionError('Failed to leave the contest. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteAccount = async () => {
    setActionError(null);
    setDeleting(true);
    try {
      await deleteMyAccount();
      showToast('Your account has been deleted', 'info');
      await auth.removeUser();
      navigate('/');
    } catch {
      setActionError('Failed to delete your account. Please try again.');
      setDeleting(false);
      refreshActiveContests();
    }
  };

  const winRate =
    stats && stats.squaresClaimed > 0
      ? `${((stats.quarterWins / stats.squaresClaimed) * 100).toFixed(0)}% win rate`
      : undefined;

  const memberSince = profile
    ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : '';

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3 } }}>
      <Helmet>
        <title>Profile – Squares</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* page-level load error */}
      {loadError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          We couldn't load your profile. Please try again.
        </Alert>
      )}

      {/* profile header */}
      <Box sx={{ textAlign: 'center', mb: 3, animation: `${popIn} 0.5s ease-out both` }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 8px 32px ${theme.palette.primary.main}40`,
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'white' }}>
              {loading ? '' : (profile?.displayName?.charAt(0) || '?').toUpperCase()}
            </Typography>
          </Box>
        </Box>

        {loading ? (
          <Skeleton variant="text" width={180} sx={{ mx: 'auto', fontSize: '2rem' }} />
        ) : (
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {profile?.displayName || '–'}
          </Typography>
        )}

        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
          {profile?.email ?? auth.user?.profile?.email}
        </Typography>
        {!loading && memberSince && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Member since {memberSince}
          </Typography>
        )}
      </Box>

      {/* stats */}
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          mb: 2,
          textAlign: 'center',
          animation: `${popIn} 0.5s ease-out 0.1s both`,
        }}
      >
        Your Numbers
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
          gap: 2,
          mb: 4,
        }}
      >
        <StatCard
          icon={<GridOnIcon sx={{ fontSize: 'inherit' }} />}
          value={stats?.contestsCreated}
          label="Contests Created"
          loading={loading}
          delay={0.15}
        />
        <StatCard
          icon={<GroupsIcon sx={{ fontSize: 'inherit' }} />}
          value={stats?.contestsJoined}
          label="Contests Joined"
          loading={loading}
          delay={0.25}
        />
        <StatCard
          icon={<GridViewIcon sx={{ fontSize: 'inherit' }} />}
          value={stats?.squaresClaimed}
          label="Squares Claimed"
          loading={loading}
          delay={0.35}
        />
        <StatCard
          icon={<EmojiEventsIcon sx={{ fontSize: 'inherit' }} />}
          value={stats?.quarterWins}
          label="Quarter Wins"
          caption={winRate}
          loading={loading}
          highlight
          delay={0.45}
        />
      </Box>

      {/* danger zone */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3,
          border: `1px solid ${theme.palette.error.main}55`,
          background: 'rgba(244,67,54,0.05)',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          animation: `${popIn} 0.5s ease-out 0.55s both`,
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
          onClick={openDeleteDialog}
          disabled={loading || loadError}
          sx={{ flexShrink: 0 }}
        >
          Delete Account
        </Button>
      </Paper>

      <DeleteAccountDialog
        open={deleteOpen}
        deleting={deleting}
        busyId={busyId}
        activeContests={activeContests}
        activeContestsError={activeContestsError}
        actionError={actionError}
        onClose={closeDeleteDialog}
        onRetry={refreshActiveContests}
        onDeleteContest={handleDeleteContest}
        onLeaveContest={handleLeaveContest}
        onConfirmDelete={handleDeleteAccount}
      />
    </Container>
  );
}
