import { useState, type ReactNode } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router';
import SignInDialog from '../../auth/SignInDialog';

// opens the create form, or asks a signed-out visitor to sign in and lands them there after
export function useStartContest(gameId?: string): { start: () => void; signInDialog: ReactNode } {
  const navigate = useNavigate();
  const auth = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);

  const path = gameId ? `/contests/create?game=${encodeURIComponent(gameId)}` : '/contests/create';

  const start = () => {
    if (auth.isAuthenticated) {
      navigate(path);
    } else {
      setSignInOpen(true);
    }
  };

  return {
    start,
    signInDialog: (
      <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} redirectPath={path} />
    ),
  };
}
