import { Box, Button, Container, Typography } from '@mui/material';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';

export default function LandingHero() {
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
    <Box
      sx={{
        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 50%, #0d47a1 100%)',
        py: { xs: 10, md: 16 },
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
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
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
                backgroundColor: 'rgba(255,255,255,0.15)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                },
                transition: 'all 0.3s ease',
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
