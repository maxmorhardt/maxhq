import useMediaQuery from '@mui/material/useMediaQuery';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthLoadingAnimation from '../../components/common/AuthLoadingAnimation';
import { useToast } from '../../hooks/useToast';

const MIN_DISPLAY_MS = 1600;
const OUTRO_DURATION_MS = 350;

export default function CallbackPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const [minTimePassed, setMinTimePassed] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const savedRedirectPath = useRef(sessionStorage.getItem('auth_redirect_path') || '/contests');
  const hasStartedOutro = useRef(false);

  // ensure intro animation always completes before we can exit
  useEffect(() => {
    const id = setTimeout(() => setMinTimePassed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code && !state) {
      showToast('Invalid authentication state', 'error');
      navigate('/', { replace: true });
    }
  }, [searchParams, navigate, showToast]);

  useEffect(() => {
    if (auth.isLoading) {
      return;
    }

    try {
      if (auth.isAuthenticated) {
        sessionStorage.removeItem('auth_redirect_path');
        setPendingPath(savedRedirectPath.current);
        return;
      }

      if (auth.error) {
        console.error('Auth error after loading and is authenticated checks', auth.error);
        showToast('Authentication failed. Please try again', 'error');
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('Error during post authentication redirect:', error);
      showToast('Authentication failed. Please try again', 'error');
      navigate('/', { replace: true });
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.error, navigate, auth, showToast]);

  // start outro once auth is ready and the minimum display time has elapsed
  useEffect(() => {
    if (!minTimePassed || !pendingPath || hasStartedOutro.current) {
      return;
    }

    hasStartedOutro.current = true;
    setIsExiting(true);

    const delay = prefersReducedMotion ? 0 : OUTRO_DURATION_MS;
    const id = setTimeout(() => {
      navigate(pendingPath, { replace: true });
    }, delay);
    return () => {
      clearTimeout(id);
      hasStartedOutro.current = false;
    };
  }, [minTimePassed, pendingPath, navigate, prefersReducedMotion]);

  return (
    <AuthLoadingAnimation
      title="Signing you in"
      subtitle="This will only take a moment"
      exiting={isExiting}
    />
  );
}
