import { Box, Button, Typography, useTheme } from '@mui/material';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';
import LandingSectionContainer from './LandingSectionContainer';

export default function LandingCallToAction() {
  const navigate = useNavigate();
  const auth = useAuth();
  const theme = useTheme();

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
    <LandingSectionContainer variant="lightBlue">
      <Typography
        variant="h3"
        gutterBottom
        sx={{
          fontWeight: 700,
          color: 'white',
          mb: 2,
          textShadow: theme.customShadows.text,
        }}
      >
        Ready to Get Started?
      </Typography>

      <Typography
        variant="h6"
        sx={{
          mb: 4,
          color: theme.customColors.textMuted,
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
            fontSize: '1.2rem',
            fontWeight: 600,
            color: 'text.primary',
            backgroundColor: theme.customBackgrounds.glass.heavy,
            '&:hover': {
              backgroundColor: theme.customBackgrounds.glass.hover,
              transform: theme.customTransforms.hoverLiftSmall,
              boxShadow: theme.customShadows.interactive,
            },
            transition: theme.customTransitions.default,
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
