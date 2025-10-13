import { Button, type ButtonProps } from '@mui/material';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';

interface LandingCreateContestButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  text?: string;
}

export default function LandingCreateContestButton({
  text = 'Create Contest',
}: LandingCreateContestButtonProps) {
  const navigate = useNavigate();
  const auth = useAuth();

  const handleClick = () => {
    if (auth.isAuthenticated) {
      navigate('/contests/create');
    } else {
      auth.signinRedirect({
        redirect_uri: `${window.location.origin}/contests/create`,
      });
    }
  };

  return (
    <Button
      variant="contained"
      size="large"
      onClick={handleClick}
      sx={{
        px: 6,
        fontSize: '1.2rem',
        fontWeight: 600,
        color: 'white',
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        transform: 'translateY(0px)',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
        },
      }}
    >
      {text}
    </Button>
  );
}
