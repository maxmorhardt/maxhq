import { Home, Login } from '@mui/icons-material';
import { Box, Button, Container, Typography, useTheme } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SignInDialog from '../../components/auth/SignInDialog';

export default function UnauthorizedPage() {
  const theme = useTheme();
  const navigate = useNavigate();

  const [signInOpen, setSignInOpen] = useState(false);

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box sx={{ textAlign: 'center', mb: 8 }}>
        <Typography
          variant="h1"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '4rem', md: '6rem' },
            mb: 2,
            color: theme.palette.primary.main,
          }}
        >
          401
        </Typography>

        <Typography
          variant="h2"
          sx={{
            fontWeight: 700,
            mb: 4,
            fontSize: { xs: '1.5rem', md: '2.5rem' },
            color: 'white',
          }}
        >
          Sign In Required
        </Typography>

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
          You need to sign in to view this contest. Please sign in and try again.
        </Typography>

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
            startIcon={<Login />}
            onClick={() => setSignInOpen(true)}
          >
            Sign In
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<Home />}
            onClick={() => navigate('/')}
          >
            Go Home
          </Button>
        </Box>
      </Box>
      <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} />
    </Container>
  );
}
