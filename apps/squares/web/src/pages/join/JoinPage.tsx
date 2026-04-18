import { Box, CircularProgress, Container, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate, useParams } from 'react-router-dom';
import InviteSignIn from '../../components/join/InviteSignIn';
import RedirectingToLogin from '../../components/common/RedirectingToLogin';
import { joinContestByToken, previewInviteToken } from '../../features/contests/contestThunks';
import { useAppDispatch } from '../../hooks/reduxHooks';
import { useToast } from '../../hooks/useToast';
import type { APIError } from '../../types/error';
import type { InvitePreviewResponse } from '../../types/contest';

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const auth = useAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const hasJoined = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<InvitePreviewResponse | null>(null);

  // fetch invite preview on mount (no auth required)
  useEffect(() => {
    if (!token) return;
    dispatch(previewInviteToken(token))
      .unwrap()
      .then(setPreview)
      .catch((err: APIError) => {
        setError(err.message || 'This invite link is invalid or expired');
      });
  }, [token, dispatch]);

  // auto-join when authenticated and preview is loaded
  useEffect(() => {
    if (!auth.isAuthenticated || !token || !preview || hasJoined.current) return;

    hasJoined.current = true;

    (async () => {
      try {
        await dispatch(joinContestByToken(token)).unwrap();
        showToast('Successfully joined contest!', 'success');
        navigate(`/contests/owner/${preview.owner}/name/${preview.contestName}`, { replace: true });
      } catch (err: unknown) {
        const apiError = err as APIError;
        // 409 = already a participant — silently redirect
        if (apiError.code === 409) {
          navigate(`/contests/owner/${preview.owner}/name/${preview.contestName}`, {
            replace: true,
          });
          return;
        }
        setError(apiError.message || 'Failed to join contest');
        showToast(apiError.message || 'Failed to join contest', 'error');
      }
    })();
  }, [auth.isAuthenticated, token, preview, dispatch, navigate, showToast]);

  // show sign-in page for unauthenticated users
  if (!auth.isAuthenticated && !auth.isLoading) {
    return <InviteSignIn />;
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ color: 'white', fontWeight: 700, mb: 2 }}>
          Unable to Join
        </Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)' }}>
          {error}
        </Typography>
      </Container>
    );
  }

  const isJoining = auth.isAuthenticated && preview && !error;

  if (!isJoining) {
    return <RedirectingToLogin subtitle="You need to sign in to join this contest" />;
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <CircularProgress size={40} />
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
          Joining contest...
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          Please wait while we add you to the contest
        </Typography>
      </Box>
    </Container>
  );
}
