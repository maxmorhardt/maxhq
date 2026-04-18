import { Box } from '@mui/material';
import LandingCTASection from '../../components/landing/cta/LandingCTASection';
import LandingFeaturesSection from '../../components/landing/features/LandingFeaturesSection';
import LandingHeroSection from '../../components/landing/LandingHeroSection';
import LandingHowItWorksSection from '../../components/landing/how-it-works/LandingHowItWorksSection';
import LandingSeeItInActionSection from '../../components/landing/see-it-in-action/LandingSeeItInActionSection';
import LandingStatsSection from '../../components/landing/LandingStatsSection';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';
import './LandingPage.css';

export default function LandingPage() {
  const howItWorks = useScrollAnimation();
  const seeItInAction = useScrollAnimation();
  const features = useScrollAnimation();
  const cta = useScrollAnimation();

  return (
    <Box sx={{ overflowX: 'clip' }}>
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
