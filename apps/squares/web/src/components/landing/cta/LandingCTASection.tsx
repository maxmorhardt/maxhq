import { Box, Container, Typography } from '@mui/material';
import type { RefObject } from 'react';
import LandingCreateContestButton from '../LandingCreateContestButton';
import LandingCTABadge from './LandingCTABadge';

interface Props {
  animRef: RefObject<HTMLDivElement | null>;
  isVisible: boolean;
}

export default function LandingCTASection({ animRef, isVisible }: Props) {
  return (
    <Box
      ref={animRef}
      className={`scroll-cinema ${isVisible ? 'visible' : ''}`}
      sx={{
        position: 'relative',
        py: { xs: 12, md: 16 },
        overflow: 'hidden',
      }}
    >
      <div className="cta-animated-bg">
        <div className="mesh-gradient-blob"></div>
        <div className="mesh-gradient-blob"></div>
        <div className="mesh-gradient-blob"></div>
        <div className="floating-particle"></div>
        <div className="floating-particle"></div>
        <div className="floating-particle"></div>
        <div className="floating-particle"></div>
        <div className="floating-particle"></div>
        <div className="floating-particle"></div>
        <div className="floating-particle"></div>
        <div className="floating-particle"></div>
      </div>

      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 900,
              color: 'white',
              mb: 3,
              textShadow: '0 4px 12px rgba(0,0,0,0.2)',
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              letterSpacing: '-0.02em',
            }}
          >
            Ready to Get Started?
          </Typography>

          <Typography
            variant="h5"
            sx={{
              mb: 5,
              color: 'rgba(255,255,255,0.95)',
              maxWidth: 600,
              mx: 'auto',
              fontWeight: 400,
              lineHeight: 1.6,
              fontSize: { xs: '1.1rem', md: '1.3rem' },
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            Create your first contest in seconds and share it with your friends and family for an
            unforgettable game experience.
          </Typography>

          <Box sx={{ mb: 6 }}>
            <LandingCreateContestButton />
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: { xs: 1, sm: 4 },
              flexWrap: 'wrap',
              px: 2,
              maxWidth: { xs: '400px', sm: 'none' },
              mx: 'auto',
            }}
          >
            <LandingCTABadge text="No credit card required" />
            <LandingCTABadge text="Setup in under 2 minutes" />
            <LandingCTABadge text="Works on all devices" />
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
