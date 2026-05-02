import { useEffect, useRef, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate, useParams } from 'react-router-dom';
import LoadingScreen from '../../components/common/LoadingScreen';
import InviteSignIn from '../../components/join/InviteSignIn';
import JoinError from '../../components/join/JoinError';
import JoinNoSquares from '../../components/join/JoinNoSquares';
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
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [preview, setPreview] = useState<InvitePreviewResponse | null>(null);

  // fetch invite preview on mount (no auth required)
  useEffect(() => {
    if (!token) return;
    dispatch(previewInviteToken(token))
      .unwrap()
      .then(setPreview)
      .catch((err: APIError) => {
        setError(err.message || 'This invite link is invalid or expired');
        setErrorCode(err.code ?? null);
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
        setErrorCode(apiError.code ?? null);
        showToast(apiError.message || 'Failed to join contest', 'error');
        hasJoined.current = false;
      }
    })();
  }, [auth.isAuthenticated, token, preview, dispatch, navigate, showToast]);

  // auth still initialising — neutral loading state (avoids flashing "sign in" briefly)
  if (auth.isLoading && auth.activeNavigator !== 'signoutSilent') {
    return <LoadingScreen title="Redirecting to sign in..." subtitle="Please wait..." />;
  }

  // unauthenticated — show sign-in prompt
  if (!auth.isAuthenticated) {
    return <InviteSignIn />;
  }

  if (errorCode === 422) {
    return <JoinNoSquares preview={preview} />;
  }

  if (error) {
    return <JoinError message={error} />;
  }

  if (!preview) {
    return <LoadingScreen title="Loading invite..." subtitle="Fetching contest details" />;
  }

  return (
    <LoadingScreen
      title="Joining contest..."
      subtitle={`Preparing your spot in ${preview.contestName}`}
    />
  );
}
