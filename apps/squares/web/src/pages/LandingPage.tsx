import { Box } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import LandingCTASection from '../features/landing/components/LandingCTASection';
import LandingFeaturesSection from '../features/landing/components/LandingFeaturesSection';
import LandingHeroSection from '../features/landing/components/LandingHeroSection';
import LandingHowItWorksSection from '../features/landing/components/LandingHowItWorksSection';
import LandingSeeItInActionSection from '../features/landing/components/LandingSeeItInActionSection';
import LandingStatsSection from '../features/landing/components/LandingStatsSection';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import '../features/landing/landing.css';

export default function LandingPage() {
  const howItWorks = useScrollAnimation();
  const seeItInAction = useScrollAnimation();
  const features = useScrollAnimation();
  const cta = useScrollAnimation();

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
      <LandingHeroSection />
      <LandingHowItWorksSection animRef={howItWorks.ref} isVisible={howItWorks.isVisible} />
      <LandingSeeItInActionSection
        animRef={seeItInAction.ref}
        isVisible={seeItInAction.isVisible}
      />
      <LandingFeaturesSection animRef={features.ref} isVisible={features.isVisible} />
      <LandingStatsSection />
      <LandingCTASection animRef={cta.ref} isVisible={cta.isVisible} />
    </Box>
  );
}
