import type { ReactNode } from 'react';
import { useAuth } from 'react-oidc-context';
import LoadingScreen from '../components/feedback/LoadingScreen';
import UnauthorizedError from '../components/errors/UnauthorizedError';

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

  if (auth.activeNavigator === 'signinRedirect') {
    return (
      <LoadingScreen title="Redirecting to sign in..." subtitle="You will be redirected shortly" />
    );
  }

  if (auth.isLoading) {
    return fallback;
  }

  if (!auth.isAuthenticated) {
    return unauthenticated;
  }

  return children;
}
