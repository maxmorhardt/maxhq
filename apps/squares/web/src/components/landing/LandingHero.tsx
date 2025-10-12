import { Box, Button, Container, Typography, useTheme } from '@mui/material';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';

export default function LandingHero() {
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
    <Box
      sx={{
        background: theme.customBackgrounds.gradients.lightBlue,
        py: { xs: 10, md: 16 },
        mb: 8,
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4rem' },
              mb: 4,
              textShadow: theme.customShadows.text,
            }}
          >
            Squares
          </Typography>

          <Typography
            variant="h4"
            sx={{
              mb: 4,
              fontWeight: 300,
              maxWidth: 700,
              mx: 'auto',
              opacity: 0.95,
              fontSize: { xs: '1.2rem', md: '1.5rem' },
              lineHeight: 1.4,
            }}
          >
            The ultimate football squares game for any gathering. Create contests, fill squares, and
            win big during the big game!
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
              Create Your First Contest
            </Button>
            <Button
              variant="outlined"
              size="large"
              sx={{
                px: 4,
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 500,
                color: 'text.primary',
              }}
              onClick={() => navigate('/learn-more')}
            >
              Learn More
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
