import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { Box, Button, Container, Typography } from '@mui/material';
import { Link } from 'react-router';
import { useScrollProgress } from '../../hooks/useScrollProgress';
import { layout, primaryTint, secondaryTint } from '../../theme';
import HeroTerminal from '../common/HeroTerminal';

// the scene is this many viewports tall; the extra beyond one is the scroll that plays the hand-off
const SCENE_VH = 220;

// 0 when the terminal is the whole first screen, 1 once it has settled beside the headline
const t = `min(var(--progress, 0) * ${SCENE_VH / (SCENE_VH - 100)}, 1)`;
// the text arrives over the second half of the hand-off
const textIn = `max(min((${t} - 0.4) / 0.5, 1), 0)`;

const pinned = (sx: object) => ({
  '@media (min-width: 900px) and (prefers-reduced-motion: no-preference)': sx,
});

const headerOffset = { xs: layout.headerHeight.xs, lg: layout.headerHeight.lg };

// the page opens on the terminal; scrolling settles it into the hero, and the headline arrives beside it
export default function HomeHero() {
  const stage = useScrollProgress<HTMLElement>({ anchor: 0 });

  return (
    <Box
      component="section"
      ref={stage}
      sx={{
        position: 'relative',
        ...pinned({ height: `${SCENE_VH}vh` }),
      }}
    >
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          py: { xs: 5, md: 8 },
          ...pinned({
            position: 'sticky',
            top: headerOffset.lg,
            height: `calc(100svh - ${headerOffset.lg})`,
            py: 0,
            display: 'flex',
            alignItems: 'center',
          }),
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
            gridTemplateAreas: { xs: '"terminal" "text"', md: '"text terminal"' },
            alignItems: 'center',
            gap: { xs: 5, md: 6 },
          }}
        >
          {/* the terminal opens the page centered and large, then slides into its column */}
          <Box
            sx={{
              gridArea: 'terminal',
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              ...pinned({
                transform: `translateX(calc((1 - ${t}) * -50%)) scale(calc(1.22 - ${t} * 0.22))`,
                transformOrigin: '50% 50%',
                willChange: 'transform',
                zIndex: 1,
              }),
            }}
          >
            {/* a horizon of light under the terminal */}
            <Box
              aria-hidden
              sx={{
                pointerEvents: 'none',
                position: 'absolute',
                left: '50%',
                top: '62%',
                width: '150%',
                aspectRatio: '2.4',
                transform: 'translateX(-50%)',
                borderRadius: '50%',
                maskImage:
                  'linear-gradient(90deg, transparent 8%, #000 32%, #000 68%, transparent 92%)',
                borderTop: 1,
                borderColor: (theme) => primaryTint(theme, 0.5),
                background: (theme) =>
                  `radial-gradient(50% 60% at 50% 0%, ${primaryTint(theme, 0.24)}, ${secondaryTint(theme, 0.05)} 55%, transparent 75%)`,
              }}
            />
            {/* above the horizon, which would otherwise paint over it */}
            <Box
              sx={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <HeroTerminal />
            </Box>
          </Box>

          <Box
            sx={{
              gridArea: 'text',
              textAlign: { xs: 'center', md: 'left' },
              ...pinned({
                opacity: textIn,
                transform: `translateX(calc((1 - ${textIn}) * -48px))`,
              }),
            }}
          >
            <Typography
              variant="h1"
              sx={{
                maxWidth: '13ch',
                mx: { xs: 'auto', md: 0 },
                // a column, not the full width, so the headline steps down a size beside the terminal
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

        {/* a cue to scroll, gone as soon as the hand-off starts */}
        <Box
          aria-hidden
          sx={{
            display: 'none',
            ...pinned({
              display: 'flex',
              position: 'absolute',
              left: '50%',
              bottom: 24,
              transform: 'translateX(-50%)',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.25,
              color: 'text.secondary',
              fontSize: '0.78rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              opacity: `max(1 - ${t} * 4, 0)`,
            }),
          }}
        >
          Scroll
          <KeyboardArrowDownIcon
            sx={{
              animation: 'hero-cue 1.6s ease-in-out infinite',
              '@keyframes hero-cue': {
                '0%, 100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(4px)' },
              },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
