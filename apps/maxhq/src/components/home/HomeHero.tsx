import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Box, Button, Container, Typography } from '@mui/material';
import { Link } from 'react-router';
import { useScrollProgress } from '../../hooks/useScrollProgress';
import { layout } from '../../theme';
import PlatformStack from './PlatformStack';

// the headline beside the platform it describes; scrolling away fans the stack's layers apart
export default function HomeHero() {
  const stage = useScrollProgress<HTMLElement>({ anchor: 0 });

  return (
    <Box component="section" ref={stage} sx={{ position: 'relative' }}>
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          py: { xs: 5, md: 6 },
          display: 'flex',
          alignItems: 'center',
          minHeight: { md: `min(calc(100svh - ${layout.headerHeight.lg}), 880px)` },
        }}
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
                `radial-gradient(55% 48% at 62% -4%, ${palette.heroGlow1}, transparent 72%)`,
                `radial-gradient(32% 30% at 92% 30%, ${palette.heroGlow2}, transparent 70%)`,
                `radial-gradient(28% 26% at 6% 60%, ${palette.heroGlow2}, transparent 72%)`,
              ].join(', ');
            },
            opacity: 0.85,
          }}
        />

        <Container
          maxWidth="lg"
          sx={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 0.95fr) minmax(0, 1.05fr)' },
            gridTemplateAreas: { xs: '"text" "stack"', md: '"text stack"' },
            alignItems: 'center',
            gap: { xs: 5, md: 6 },
          }}
        >
          <Box sx={{ gridArea: 'stack' }}>
            <PlatformStack />
          </Box>

          <Box
            sx={{
              gridArea: 'text',
              textAlign: { xs: 'center', md: 'left' },
            }}
          >
            <Typography
              variant="h1"
              sx={{
                maxWidth: '13ch',
                mx: { xs: 'auto', md: 0 },
                // a column, not the full width, so the headline steps down a size beside the stack
                fontSize: { md: 'clamp(3rem, 5.2vw, 4.4rem)' },
              }}
            >
              Platforms, from the API to the cluster.
            </Typography>
            <Typography
              sx={{
                mt: { xs: 2.5, md: 3 },
                maxWidth: '52ch',
                mx: { xs: 'auto', md: 0 },
                fontSize: { xs: '1.05rem', md: '1.15rem' },
              }}
            >
              I&apos;m{' '}
              <Box component="strong" sx={{ color: 'text.primary', fontWeight: 620 }}>
                Max Morhardt
              </Box>
              , a software engineer at Fidelity Investments building multi-tenant developer
              platforms on AWS and EKS. Off the clock I run two Kubernetes clusters of my own, and
              every app on this site ships to them.
            </Typography>
            <Box
              sx={{
                mt: { xs: 4, md: 4.5 },
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: { xs: 'center', md: 'flex-start' },
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
              <Button
                component={Link}
                to="/contact"
                variant="outlined"
                color="inherit"
                size="large"
              >
                Get in touch
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
