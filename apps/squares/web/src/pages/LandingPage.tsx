import { Box } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import LandingCallToAction from '../features/landing/components/LandingCallToAction';
import LandingFeatures from '../features/landing/components/LandingFeatures';
import LandingHero from '../features/landing/components/LandingHero';
import LandingPlaybook from '../features/landing/components/LandingPlaybook';
import LandingScoreboard from '../features/landing/components/LandingScoreboard';

export default function LandingPage() {
  return (
    <Box sx={{ overflowX: 'clip' }}>
      <Helmet>
        <title>Squares – NFL Football Squares Pools</title>
        <meta
          name="description"
          content="Create and join NFL football squares pools. Claim squares, track live scores, and compete with friends in real-time."
        />
        <link rel="canonical" href="https://squares.maxhq.io/" />
      </Helmet>
      <LandingHero />
      <LandingPlaybook />
      <LandingScoreboard />
      <LandingFeatures />
      <LandingCallToAction />
    </Box>
  );
}
