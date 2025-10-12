import { Box, Button, Typography } from '@mui/material';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';
import LandingSectionContainer from './LandingSectionContainer';

export default function LandingCallToAction() {
  const navigate = useNavigate();
  const auth = useAuth();

  const handleGetStarted = () => {
    if (auth.isAuthenticated) {
      navigate('/contests/create');
    } else {
      auth.signinRedirect({
        redirect_uri: `${window.location.origin}/contests/create`,
      });
    }
  };

  return (
    <LandingSectionContainer>
      <Typography
        variant="h3"
        gutterBottom
        sx={{
          fontWeight: 700,
          color: 'text.primary',
          mb: 2,
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}
      >
        Ready to Get Started?
      </Typography>
      <Typography
        variant="h6"
        sx={{
          mb: 4,
          color: 'rgba(255,255,255,0.9)',
          maxWidth: 500,
          mx: 'auto',
          fontWeight: 400,
          lineHeight: 1.5,
        }}
      >
        Create your first contest in seconds and share it with your friends and family for an
        unforgettable game experience.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleGetStarted}
          sx={{
            px: 6,
            py: 2,
            fontSize: '1.1rem',
            fontWeight: 600,
            borderRadius: 3,
            textTransform: 'none',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            boxShadow: '0 4px 12px rgba(255,255,255,0.1)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 16px rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.25)',
            },
          }}
        >
          Create Contest Now
        </Button>
      </Box>

      <Box
        sx={{
          mt: 4,
          display: 'flex',
          justifyContent: 'center',
          gap: 4,
          flexWrap: 'wrap',
          opacity: 0.9,
        }}
      >
        <Typography
          variant="body2"
          sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255,255,255,0.8)' }}
        >
          ✅ No credit card required
        </Typography>
        <Typography
          variant="body2"
          sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255,255,255,0.8)' }}
        >
          ✅ Setup in under 2 minutes
        </Typography>
        <Typography
          variant="body2"
          sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255,255,255,0.8)' }}
        >
          ✅ Works on all devices
        </Typography>
      </Box>
    </LandingSectionContainer>
  );
}
