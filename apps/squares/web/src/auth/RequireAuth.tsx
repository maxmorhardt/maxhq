import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from 'react-oidc-context';
import LoadingScreen from '../components/feedback/LoadingScreen';
import UnauthorizedError from '../components/errors/UnauthorizedError';
import { refreshSession } from './token';

interface Props {
  children: ReactNode;
  // shown while the session is restored; pages pass their own skeleton so the layout does not jump
  fallback?: ReactNode;
  unauthenticated?: ReactNode;
}

// the auth gate every signed-in page goes through: redirecting, restoring, signed out, then the page
export default function RequireAuth({
  children,
  fallback = null,
  unauthenticated = <UnauthorizedError />,
}: Props) {
  const auth = useAuth();
  const [renewSettled, setRenewSettled] = useState(false);

  // a session that expired while the app was closed loads as signed out until its refresh token renews it
  const renewable = !auth.isLoading && !auth.isAuthenticated && !!auth.user?.refresh_token;

  useEffect(() => {
    if (renewable && !renewSettled) {
      void refreshSession().finally(() => setRenewSettled(true));
    }
  }, [renewable, renewSettled]);

  if (auth.activeNavigator === 'signinRedirect') {
    return (
      <LoadingScreen title="Redirecting to sign in..." subtitle="You will be redirected shortly" />
    );
  }

  if (auth.isLoading || (renewable && !renewSettled)) {
    return fallback;
  }

  if (!auth.isAuthenticated) {
    return unauthenticated;
  }

  return children;
}
