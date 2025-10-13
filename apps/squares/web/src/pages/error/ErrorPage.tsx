import { BugReport, Home, Refresh } from '@mui/icons-material';
import { Box, Button, Container, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface ErrorPageProps {
  error?: Error;
  resetError?: () => void;
}

export default function ErrorPage({ error, resetError }: ErrorPageProps) {
  const theme = useTheme();
  const navigate = useNavigate();

  if (error) {
    console.log('Error Page rendered with error:', error);
  }

  const handleGoHome = () => {
    navigate('/');
  };

  const handleRefresh = () => {
    if (resetError) {
      resetError();
    } else {
      window.location.reload();
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box sx={{ textAlign: 'center', mb: 8 }}>
        {/* icon */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mb: 4,
          }}
        >
          <Box
            sx={{
              p: 3,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
              display: 'inline-flex',
            }}
          >
            <BugReport sx={{ fontSize: 64, color: 'white' }} />
          </Box>
        </Box>

        {/* title */}
        <Typography
          variant="h2"
          sx={{
            fontWeight: 700,
            mb: 4,
            background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Oops! Something went wrong
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
          }}
        >
          We encountered an unexpected error while processing your request. Don't worry - it's not
          your fault! Our team has been notified and we're working to fix this issue.
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
          <Button
            variant="contained"
            size="large"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            sx={{
              fontSize: '1.1rem',
            }}
          >
            Try Again
          </Button>

          <Button
            variant="outlined"
            size="large"
            startIcon={<Home />}
            onClick={handleGoHome}
            sx={{
              color: 'white',
              fontSize: '1.1rem',
            }}
          >
            Go Home
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
          Still having trouble?
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
          If the problem persists, please contact our support team. We're here to help and will get
          you back to creating amazing squares contests!
        </Typography>
        <Button
          variant="text"
          onClick={() => navigate('/contact')}
          sx={{
            fontWeight: 600,
            textTransform: 'none',
          }}
        >
          Contact Support
        </Button>
      </Box>
    </Container>
  );
}
