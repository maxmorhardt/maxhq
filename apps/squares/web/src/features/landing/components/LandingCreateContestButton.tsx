import { ArrowForward } from '@mui/icons-material';
import { Button } from '@mui/material';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router';
import SignInDialog from '../../../auth/SignInDialog';

export default function LandingCreateContestButton() {
  const navigate = useNavigate();
  const auth = useAuth();

  const [signInOpen, setSignInOpen] = useState(false);

  const handleClick = () => {
    if (auth.isAuthenticated) {
      navigate('/contests/create');
    } else {
      setSignInOpen(true);
    }
  };

  return (
    <>
      <Button variant="contained" size="large" onClick={handleClick} endIcon={<ArrowForward />}>
        Create a Contest
      </Button>
      <SignInDialog
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        redirectPath="/contests/create"
      />
    </>
  );
}
