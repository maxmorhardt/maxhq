import { ErrorOutline, Home, Refresh, Search } from '@mui/icons-material';
import { Box, Button, Container, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function GenericErrorDisplay() {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleHome = () => {
    navigate('/');
  };

  const handleBrowseContests = () => {
    navigate('/contests');
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
      <Box sx={{ mb: 6 }}>
        {/* icon */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <ErrorOutline sx={{ fontSize: 48, color: '#ff6b6b' }} />
        </Box>

        {/* title */}
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            mb: 2,
            color: theme.palette.primary.main,
          }}
        >
          Failed to get your contest
        </Typography>

        {/* message */}
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 4, lineHeight: 1.6, maxWidth: 600, mx: 'auto' }}
        >
          We couldn't load the contest right now. Please try again.
        </Typography>

        {/* actions */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={handleRetry} startIcon={<Refresh />}>
            Try Again
          </Button>

          <Button variant="outlined" onClick={handleHome} startIcon={<Home />}>
            Go Home
          </Button>

          <Button variant="outlined" onClick={handleBrowseContests} startIcon={<Search />}>
            Browse Contests
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
