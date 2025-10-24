import { Home, Search } from '@mui/icons-material';
import { Box, Button, Container, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoToContests = () => {
    navigate('/contests');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box sx={{ textAlign: 'center', mb: 8 }}>
        {/* 404 */}
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

        {/* title */}
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

        {/* description */}
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

        {/* actions */}
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

          <Button
            variant="outlined"
            size="large"
            startIcon={<Search />}
            onClick={handleGoToContests}
          >
            Browse Contests
          </Button>
        </Box>
      </Box>

      {/* additional help */}
      <Box
        sx={{
          background: theme.palette.grey[900],
          border: `1px solid ${theme.palette.grey[800]}`,
          borderRadius: 3,
          p: 4,
          textAlign: 'center',
          maxWidth: 600,
          mx: 'auto',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: 'white',
            mb: 2,
            fontWeight: 600,
          }}
        >
          Looking for something specific?
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: 'white',
            opacity: 0.9,
            mb: 3,
            lineHeight: 1.6,
          }}
        >
          Try visiting our contests page to see all available squares games, or head to the home
          page to learn more about how Squares works.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button variant="text" onClick={() => navigate('/learn-more')} sx={{ fontWeight: 600 }}>
            Learn More
          </Button>
          <Button variant="text" onClick={() => navigate('/contact')} sx={{ fontWeight: 600 }}>
            Contact Support
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
