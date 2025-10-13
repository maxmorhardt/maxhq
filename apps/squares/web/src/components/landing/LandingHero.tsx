import { Box, Button, Container, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { gradients } from '../../types/gradients';
import LandingCreateContestButton from './LandingCreateContestButton';

export default function LandingHero() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        background: gradients.lightBlue,
        py: { xs: 10, md: 16 },
        mb: 8,
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', position: 'relative' }}>
          <Typography
            variant="h1"
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
            <LandingCreateContestButton text="Create Your First Contest" />
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
