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
        <title>Squares – Football Squares Online</title>
        <meta
          name="description"
          content="Run football squares and Super Bowl squares online. Set up a 10x10 board for any NFL game, share one link, and the live score picks each quarter's square."
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
