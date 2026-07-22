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
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../../components/common/LoadingScreen';
import LeaderboardRankCard from '../../components/leaderboard/LeaderboardRankCard';
import { popIn } from '../../components/profile/animations';
import DeleteAccountDialog from '../../components/profile/DeleteAccountDialog';
import StatCard from '../../components/profile/StatCard';
import { deleteContest, removeContestParticipant } from '../../features/contests/contestThunks';
import {
  selectMyRank,
  selectMyRankError,
  selectMyRankLoading,
} from '../../features/leaderboard/leaderboardSelectors';
import { fetchMyRank } from '../../features/leaderboard/leaderboardThunks';
import {
  selectUserProfile,
  selectUserProfileError,
  selectUserProfileLoading,
  selectUserStats,
  selectUserStatsLoading,
  selectUserStatsError,
} from '../../features/user/userSelectors';
import { loadUserProfile, loadUserStats, updateUserInitials } from '../../features/user/userThunks';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { useAxiosAuth } from '../../hooks/useAxiosAuth';
import { useToast } from '../../hooks/useToast';
import { deleteMyAccount, getMyActiveContests } from '../../service/userService';
import type { UserActiveContest } from '../../types/user';
import UnauthorizedPage from '../error/UnauthorizedPage';

export default function ProfilePage() {
  const auth = useAuth();
  const axiosReady = useAxiosAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  // the profile and stats are loaded app-wide so they are seamless on first visit
  const profile = useAppSelector(selectUserProfile);
  const profileLoading = useAppSelector(selectUserProfileLoading);
  const profileError = useAppSelector(selectUserProfileError);
  const stats = useAppSelector(selectUserStats);
  const statsFetching = useAppSelector(selectUserStatsLoading);
  const statsError = useAppSelector(selectUserStatsError);
  const myRank = useAppSelector(selectMyRank);
  const myRankLoading = useAppSelector(selectMyRankLoading);
  const myRankError = useAppSelector(selectMyRankError);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeContests, setActiveContests] = useState<UserActiveContest[] | null>(null);
  const [activeContestsError, setActiveContestsError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editingInitials, setEditingInitials] = useState(false);
  const [initialsValue, setInitialsValue] = useState('');
  const [savingInitials, setSavingInitials] = useState(false);

  const userEmail = profile?.email ?? auth.user?.profile?.email ?? '';
  const loading = profileLoading && !profile;
  const loadError = Boolean(profileError) && !profile;

  const profileRetried = useRef(false);
  const statsRetried = useRef(false);
  const rankRetried = useRef(false);

  useEffect(() => {
    if (!auth.isAuthenticated || !axiosReady) {
      return;
    }
    if (!profile && !profileLoading && !profileRetried.current) {
      profileRetried.current = true;
      dispatch(loadUserProfile());
    }
    if (!stats && !statsFetching && !statsRetried.current) {
      statsRetried.current = true;
      dispatch(loadUserStats());
    }
    // the rank is not loaded app-wide, so the profile page always fetches it once
    if (!rankRetried.current) {
      rankRetried.current = true;
      dispatch(fetchMyRank());
    }
  }, [auth.isAuthenticated, axiosReady, profile, profileLoading, stats, statsFetching, dispatch]);

  const startEditingInitials = () => {
    setInitialsValue(profile?.defaultInitials ?? '');
    setEditingInitials(true);
  };

  const handleInitialsChange = (event: ChangeEvent<HTMLInputElement>) => {
    // alphanumeric only, uppercase, max 3 chars to match the backend rules
    setInitialsValue(
      event.target.value
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 3)
    );
  };

  const handleSaveInitials = async () => {
    if (!initialsValue.trim()) {
      return;
    }

    setSavingInitials(true);
    try {
      await dispatch(updateUserInitials(initialsValue)).unwrap();
      showToast('Your initials have been updated', 'success');
      setEditingInitials(false);
    } catch {
      showToast('Failed to update your initials. Please try again', 'error');
    } finally {
      setSavingInitials(false);
    }
  };

  // show redirecting state while a sign-in redirect is in flight
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

  // share of the quarters the user had a stake in that they actually won
  const winRate =
    stats && stats.quartersPlayed > 0
      ? `${((stats.quarterWins / stats.quartersPlayed) * 100).toFixed(0)}% win rate`
      : undefined;

  const memberSince = profile
    ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : '';

  const statsLoading = !stats && !statsError;

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
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
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
          loading={statsLoading}
          delay={0.15}
        />
        <StatCard
          icon={<GroupsIcon sx={{ fontSize: 'inherit' }} />}
          value={stats?.contestsJoined}
          label="Contests Joined"
          loading={statsLoading}
          delay={0.25}
        />
        <StatCard
          icon={<GridViewIcon sx={{ fontSize: 'inherit' }} />}
          value={stats?.squaresClaimed}
          label="Squares Claimed"
          loading={statsLoading}
          delay={0.35}
        />
        <StatCard
          icon={<EmojiEventsIcon sx={{ fontSize: 'inherit' }} />}
          value={stats?.quarterWins}
          label="Quarter Wins"
          caption={winRate}
          loading={statsLoading}
          highlight
          delay={0.45}
        />
      </Box>

      {/* leaderboard standing */}
      <LeaderboardRankCard
        rank={myRank}
        loading={myRankLoading && !myRank}
        error={Boolean(myRankError)}
      />

      {/* default initials */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 4,
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
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
            Default Initials
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Shown on every square you claim. Changing them updates your squares in active contests.
          </Typography>
        </Box>

        {editingInitials ? (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
            <TextField
              size="small"
              label="Initials"
              value={initialsValue}
              onChange={handleInitialsChange}
              disabled={savingInitials}
              sx={{ width: 110 }}
            />
            <Button
              variant="contained"
              onClick={handleSaveInitials}
              disabled={savingInitials || !initialsValue.trim()}
            >
              Save
            </Button>
            <Button
              color="inherit"
              onClick={() => setEditingInitials(false)}
              disabled={savingInitials}
            >
              Cancel
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexShrink: 0 }}>
            {loading ? (
              <Skeleton variant="text" width={48} sx={{ fontSize: '1.5rem' }} />
            ) : (
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: 1 }}>
                {profile?.defaultInitials || '—'}
              </Typography>
            )}
            <Button
              variant="outlined"
              onClick={startEditingInitials}
              disabled={loading || loadError}
            >
              Edit
            </Button>
          </Box>
        )}
      </Paper>

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
          animation: `${popIn} 0.5s ease-out 0.65s both`,
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
