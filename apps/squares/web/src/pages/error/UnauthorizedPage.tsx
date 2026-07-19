import { Home, Login, LockPerson, Schedule } from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SignInDialog from '../../components/auth/SignInDialog';
import ErrorState from '../../components/common/ErrorState';
import { gradients } from '../../types/gradients';

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  const [signInOpen, setSignInOpen] = useState(false);

  return (
    <ErrorState
      icon={LockPerson}
      accent={gradients.primary}
      label="401"
      title="Sign In Required"
      description="You need to sign in to view this contest. Please sign in and try again."
      actions={[
        { label: 'Sign In', onClick: () => setSignInOpen(true), icon: Login },
        { label: 'Go Home', onClick: () => navigate('/'), icon: Home },
      ]}
      hints={[
        {
          icon: Schedule,
          text: 'If you were signed in before, your session may have expired.',
        },
      ]}
    >
      <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} />
    </ErrorState>
  );
}
