import { Button, useTheme } from '@mui/material';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';
import SignInDialog from '../auth/SignInDialog';

export default function LandingCreateContestButton() {
  const navigate = useNavigate();
  const theme = useTheme();
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
      <Button
        variant="contained"
        size="large"
        onClick={handleClick}
        sx={{
          px: { xs: 2, sm: 4 },
          py: { xs: 1, sm: 2 },
          fontSize: { xs: '1rem', sm: '1.2rem' },
          fontWeight: 600,
          color: 'white',
          background: theme.palette.primary.dark,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
          },
        }}
      >
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
