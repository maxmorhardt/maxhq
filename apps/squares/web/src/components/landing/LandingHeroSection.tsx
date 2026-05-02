import { Box, Button, Container, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LandingCreateContestButton from './LandingCreateContestButton';
import { gradients } from '../../types/gradients';

export default function LandingHeroSection() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        background: gradients.lightBlue,
        py: { xs: 20, md: 30 },
        mb: 12,
        // squares grid motif
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 40%, transparent 80%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 60% at 50% 50%, black 40%, transparent 80%)',
          pointerEvents: 'none',
        },
        // soft radial highlight
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.18) 0%, transparent 55%), radial-gradient(circle at 80% 90%, rgba(0,0,0,0.25) 0%, transparent 60%)',
          pointerEvents: 'none',
        },
      }}
    >
      {/* floating accent squares */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: { xs: '12%', md: '18%' },
          left: { xs: '6%', md: '12%' },
          width: { xs: 56, md: 88 },
          height: { xs: 56, md: 88 },
          border: '2px solid rgba(255,255,255,0.35)',
          borderRadius: 2,
          transform: 'rotate(-12deg)',
          backdropFilter: 'blur(2px)',
          background: 'rgba(255,255,255,0.06)',
          animation: 'hero-float-a 9s ease-in-out infinite',
          display: { xs: 'none', sm: 'block' },
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          bottom: { xs: '10%', md: '15%' },
          right: { xs: '8%', md: '14%' },
          width: { xs: 72, md: 120 },
          height: { xs: 72, md: 120 },
          border: '2px solid rgba(255,255,255,0.25)',
          borderRadius: 2,
          transform: 'rotate(18deg)',
          background: 'rgba(255,255,255,0.04)',
          animation: 'hero-float-b 11s ease-in-out infinite',
          display: { xs: 'none', sm: 'block' },
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: '55%',
          right: '8%',
          width: 36,
          height: 36,
          borderRadius: 1.5,
          background: 'rgba(255,255,255,0.18)',
          transform: 'rotate(8deg)',
          animation: 'hero-float-c 7s ease-in-out infinite',
          display: { xs: 'none', md: 'block' },
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center', position: 'relative' }}>
          <Typography
            variant="h1"
            className="hero-mount"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '3.75rem', md: '5.5rem', lg: '6.25rem' },
              lineHeight: 1.05,
              mb: 3,
              textShadow: '0 4px 24px rgba(0,0,0,0.35)',
            }}
          >
            Squares
          </Typography>

          <Typography
            variant="h4"
            className="hero-mount delay-1"
            sx={{
              mb: 5,
              fontWeight: 300,
              maxWidth: 720,
              mx: 'auto',
              opacity: 0.95,
              fontSize: { xs: '1.15rem', md: '1.45rem' },
              lineHeight: 1.5,
            }}
          >
            The ultimate football squares game for any gathering. Create contests, fill squares, and
            win big during the big game!
          </Typography>

          <Box
            className="hero-mount delay-2"
            sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'nowrap' }}
          >
            <LandingCreateContestButton />
            <Button
              variant="outlined"
              size="large"
              sx={{
                px: { xs: 2, sm: 4 },
                py: { xs: 1, sm: 1.5 },
                fontSize: { xs: '1rem', sm: '1.1rem' },
                fontWeight: 500,
                color: 'text.primary',
                borderColor: 'rgba(255,255,255,0.6)',
                '&:hover': {
                  borderColor: 'white',
                  background: 'rgba(255,255,255,0.08)',
                },
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
