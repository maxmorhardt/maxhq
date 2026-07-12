import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GridOnIcon from '@mui/icons-material/GridOn';
import GridViewIcon from '@mui/icons-material/GridView';
import GroupsIcon from '@mui/icons-material/Groups';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  keyframes,
  Paper,
  Skeleton,
  Typography,
  useTheme,
} from '@mui/material';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../../components/common/LoadingScreen';
import { useAxiosAuth } from '../../hooks/useAxiosAuth';
import { useToast } from '../../hooks/useToast';
import { deleteMyAccount, getMyProfile, getMyStats } from '../../service/userService';
import type { UserProfile, UserStats } from '../../types/user';
import UnauthorizedPage from '../error/UnauthorizedPage';

const popIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

interface StatCardProps {
  icon: ReactNode;
  value: number | undefined;
  label: string;
  caption?: string;
  loading: boolean;
  highlight?: boolean;
  delay: number;
}

function StatCard({ icon, value, label, caption, loading, highlight, delay }: StatCardProps) {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        textAlign: 'center',
        px: 2,
        py: 2.5,
        borderRadius: 3,
        background: highlight
          ? `linear-gradient(135deg, ${theme.palette.primary.dark}33 0%, ${theme.palette.primary.main}22 100%)`
          : 'rgba(255,255,255,0.04)',
        border: highlight
          ? `1px solid ${theme.palette.primary.main}66`
          : '1px solid rgba(255,255,255,0.08)',
        animation: `${popIn} 0.5s ease-out ${delay}s both`,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          mb: 1,
          color: 'primary.main',
          fontSize: 32,
        }}
      >
        {icon}
      </Box>
      {loading ? (
        <Skeleton variant="text" width={60} sx={{ mx: 'auto', fontSize: '2rem' }} />
      ) : (
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
          {value?.toLocaleString() ?? '—'}
        </Typography>
      )}
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
        {label}
      </Typography>
      {caption && !loading && (
        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
          {caption}
        </Typography>
      )}
    </Paper>
  );
}

export default function ProfilePage() {
  const auth = useAuth();
  const axiosReady = useAxiosAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const [profileRes, statsRes] = await Promise.all([getMyProfile(), getMyStats()]);
      setProfile(profileRes);
      setStats(statsRes);
    } catch {
      showToast('Failed to load your profile', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteMyAccount();
      showToast('Your account has been deleted', 'info');
      await auth.removeUser();
      navigate('/');
    } catch {
      showToast('Failed to delete your account', 'error');
      setDeleting(false);
      setDeleteOpen(false);
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
            {profile?.displayName || '—'}
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
            Deleting your account removes your active contests, frees your claimed squares, and
            anonymizes your contest history. This cannot be undone.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteForeverIcon />}
          onClick={() => setDeleteOpen(true)}
          disabled={loading}
          sx={{ flexShrink: 0 }}
        >
          Delete Account
        </Button>
      </Paper>

      {/* delete confirmation */}
      <Dialog open={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)}>
        <DialogTitle>Delete your account?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your active contests will be deleted, your squares released, and your contest history
            anonymized. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={
              deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteForeverIcon />
            }
          >
            Delete Forever
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
