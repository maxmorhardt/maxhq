import { Home, Search } from '@mui/icons-material';
import { Box, Button, Container, Typography, useTheme } from '@mui/material';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';

// 404 error page with navigation options
export default function NotFoundPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const auth = useAuth();

  // navigate to home page
  const handleGoHome = () => {
    navigate('/');
  };

  // navigate to contests page
  const handleGoToContests = () => {
    navigate('/contests');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {/* main error message and navigation */}
      <Box sx={{ textAlign: 'center', mb: 8 }}>
        {/* 404 number display */}
        <Typography
          variant="h1"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '4rem', md: '6rem' },
            mb: 2,
            color: theme.palette.primary.main,
          }}
        >
          404
        </Typography>

        {/* page not found heading */}
        <Typography
          variant="h2"
          sx={{
            fontWeight: 700,
            mb: 4,
            fontSize: { xs: '1.5rem', md: '2.5rem' },
            color: 'white',
          }}
        >
          Page Not Found
        </Typography>

        {/* error description text */}
        <Typography
          variant="h6"
          sx={{
            color: 'white',
            opacity: 0.9,
            fontWeight: 300,
            maxWidth: 600,
            mx: 'auto',
            mb: 6,
            lineHeight: 1.6,
          }}
        >
          The page you're looking for doesn't exist. It might have been moved, deleted, or you
          entered the wrong URL.
        </Typography>

        {/* navigation action buttons */}
        <Box
          sx={{
            display: 'flex',
            gap: 3,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Button variant="contained" size="large" startIcon={<Home />} onClick={handleGoHome}>
            Go Home
          </Button>
          {auth.isAuthenticated && (
            <Button
              variant="outlined"
              size="large"
              startIcon={<Search />}
              onClick={handleGoToContests}
            >
              Browse Contests
            </Button>
          )}
        </Box>
      </Box>
    </Container>
  );
}
