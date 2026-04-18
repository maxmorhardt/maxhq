import { Home, Lock, Search } from '@mui/icons-material';
import { Box, Button, Container, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function ForbiddenPage() {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box sx={{ textAlign: 'center', mb: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Lock sx={{ fontSize: 48, color: '#ff6b6b' }} />
        </Box>

        <Typography
          variant="h1"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '4rem', md: '6rem' },
            mb: 2,
            color: theme.palette.primary.main,
          }}
        >
          403
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
          Access Denied
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
          This contest is private. You need an invite link from the contest owner to access it.
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
            startIcon={<Home />}
            onClick={() => navigate('/')}
          >
            Go Home
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<Search />}
            onClick={() => navigate('/contests')}
          >
            My Contests
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
