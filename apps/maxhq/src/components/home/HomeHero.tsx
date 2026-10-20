import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Box, Button, Container, Typography } from '@mui/material';
import { Link } from 'react-router';
import { useScrollProgress } from '../../hooks/useScrollProgress';
import { primaryTint, secondaryTint } from '../../theme';
import HeroTerminal from '../common/HeroTerminal';
import RevealSection from '../common/RevealSection';

// the terminal starts tipped back and settles flat over the first third of the hero's scroll
const settle = 'min(var(--progress, 0) * 3, 1)';

export default function HomeHero() {
  const stage = useScrollProgress<HTMLElement>({ anchor: 0 });

  return (
    <Box
      component="section"
      ref={stage}
      sx={{ position: 'relative', overflow: 'hidden', pt: { xs: 8, md: 13 }, pb: { xs: 4, md: 6 } }}
    >
      {/* light from above, cooler off to the side */}
      <Box
        aria-hidden
        sx={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: 0,
          background: (theme) => {
            const { palette } = theme.vars ?? theme;

            return [
              `radial-gradient(55% 42% at 50% -4%, ${palette.heroGlow1}, transparent 72%)`,
              `radial-gradient(32% 30% at 88% 22%, ${palette.heroGlow2}, transparent 70%)`,
              `radial-gradient(28% 26% at 8% 40%, ${palette.heroGlow2}, transparent 72%)`,
            ].join(', ');
          },
          opacity: 0.85,
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', textAlign: 'center' }}>
        <RevealSection>
          <Typography variant="h1" sx={{ mx: 'auto', maxWidth: '13ch' }}>
            Platforms, from the API to the cluster.
          </Typography>
        </RevealSection>

        <RevealSection delay={1}>
          <Typography
            sx={{
              mt: { xs: 2.5, md: 3.5 },
              mx: 'auto',
              maxWidth: '58ch',
              fontSize: { xs: '1.05rem', md: '1.22rem' },
            }}
          >
            I&apos;m{' '}
            <Box component="strong" sx={{ color: 'text.primary', fontWeight: 620 }}>
              Max Morhardt
            </Box>
            , a software engineer at Fidelity Investments building multi-tenant developer platforms
            on AWS and EKS. Off the clock I run two Kubernetes clusters of my own, and every app on
            this site ships to them.
          </Typography>
        </RevealSection>

        <RevealSection
          delay={2}
          sx={{
            mt: { xs: 4, md: 5 },
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 1.5,
          }}
        >
          <Button
            component={Link}
            to="/projects"
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
          >
            Explore the projects
          </Button>
          <Button component={Link} to="/contact" variant="outlined" color="inherit" size="large">
            Get in touch
          </Button>
        </RevealSection>

        {/* the terminal rises out of a horizon of light */}
        <RevealSection
          delay={3}
          variant="rise"
          sx={{ position: 'relative', mt: { xs: 7, md: 10 }, perspective: '1800px' }}
        >
          <Box
            aria-hidden
            sx={{
              pointerEvents: 'none',
              position: 'absolute',
              left: '50%',
              top: '58%',
              width: { xs: '220%', md: '150%' },
              aspectRatio: '2.4',
              transform: 'translateX(-50%)',
              borderRadius: '50%',
              maskImage:
                'linear-gradient(90deg, transparent 8%, #000 32%, #000 68%, transparent 92%)',
              borderTop: 1,
              borderColor: (theme) => primaryTint(theme, 0.55),
              background: (theme) =>
                `radial-gradient(50% 60% at 50% 0%, ${primaryTint(theme, 0.28)}, ${secondaryTint(theme, 0.06)} 55%, transparent 75%)`,
            }}
          />

          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              transformOrigin: '50% 0%',
              transform: `rotateX(calc((1 - ${settle}) * 18deg)) scale(calc(0.93 + ${settle} * 0.07))`,
              willChange: 'transform',
              '@media (prefers-reduced-motion: reduce)': { transform: 'none' },
            }}
          >
            <HeroTerminal />
          </Box>
        </RevealSection>
      </Container>
    </Box>
  );
}
