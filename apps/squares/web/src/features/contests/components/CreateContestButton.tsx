import { ArrowForward } from '@mui/icons-material';
import { Button, type ButtonProps } from '@mui/material';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router';
import SignInDialog from '../../../auth/SignInDialog';

interface Props {
  size?: ButtonProps['size'];
  label?: string;
}

// signed-out visitors sign in first and land on the create form
export default function CreateContestButton({ size = 'large', label = 'Create a Contest' }: Props) {
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
      <Button
        variant="contained"
        size={size}
        onClick={handleClick}
        endIcon={<ArrowForward />}
        sx={{ whiteSpace: 'nowrap' }}
      >
        {label}
      </Button>
      <SignInDialog
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        redirectPath="/contests/create"
      />
    </>
  );
}
