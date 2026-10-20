import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CodeIcon from '@mui/icons-material/Code';
import DnsIcon from '@mui/icons-material/Dns';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { Box, Button, Container, Link as MuiLink, Typography } from '@mui/material';
import { Link } from 'react-router';
import SquaresBoard from '../components/apps/SquaresBoard';
import PageMeta from '../components/common/PageMeta';
import RevealSection from '../components/common/RevealSection';
import ChapterRail, { type Chapter } from '../components/home/ChapterRail';
import ClusterDiagram from '../components/home/ClusterDiagram';
import CodeWindow from '../components/home/CodeWindow';
import HomeHero from '../components/home/HomeHero';
import ImpactList from '../components/home/ImpactList';
import PipelineVisual from '../components/home/PipelineVisual';
import StackMarquee from '../components/home/StackMarquee';
import { pageSection, primaryTint } from '../theme';

const chapters: Chapter[] = [
  {
    id: 'build',
    icon: <CodeIcon />,
    title: 'Build it end to end.',
    body: 'Java and Spring Boot or Go and Gin on the server, Angular or React in front. I design the API, write the service behind it, and build the interface on top, so the seams between them stay clean.',
    visual: <CodeWindow />,
  },
  {
    id: 'ship',
    icon: <RocketLaunchIcon />,
    title: 'Ship it on merge.',
    body: 'A merge to main builds an image tagged with its commit, and Argo CD rolls it out to dev. A release tag promotes that same image to production, never rebuilt. Git is the only way anything reaches a cluster.',
    visual: <PipelineVisual />,
  },
  {
    id: 'run',
    icon: <DnsIcon />,
    title: 'Run it myself.',
    body: 'Two k3s clusters I provision and operate: dev on Raspberry Pis at home, production on three cloud VPSes, each with a highly available control plane. Envoy Gateway is the single front door, Dex federates sign-in, and CloudNativePG and Valkey hold the state.',
    visual: <ClusterDiagram />,
  },
];

const ledeSx = { mt: 2.5, maxWidth: '56ch', fontSize: { md: '1.12rem' } } as const;

export default function HomePage() {
  return (
    <Box sx={{ overflowX: 'clip' }}>
      <PageMeta
        title="Max Morhardt – Software Engineer"
        description="Max Morhardt is a Software Engineer at Fidelity Investments specializing in Java, Spring Boot, Go, TypeScript, React, Angular, Kubernetes, Terraform, and AWS."
        canonical="https://maxhq.io/"
      />

      <HomeHero />

      {/* build, ship, run */}
      <Box component="section" aria-label="How I work" sx={pageSection}>
        <Container maxWidth="lg">
          <ChapterRail chapters={chapters} />
        </Container>
      </Box>

      {/* the day job */}
      <Box component="section" sx={pageSection}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { lg: 'minmax(0, 0.8fr) minmax(0, 1.2fr)' },
              gap: { xs: 5, lg: 10 },
              alignItems: 'start',
            }}
          >
            <Box sx={{ position: { lg: 'sticky' }, top: { lg: 120 } }}>
              <RevealSection>
                <Typography variant="h2">What the day job moved.</Typography>
              </RevealSection>
              <RevealSection delay={1}>
                <Typography sx={ledeSx}>
                  Platform engineering at Fidelity Investments since 2023, on the team that runs
                  cloud development environments for thousands of users.
                </Typography>
              </RevealSection>
              <RevealSection delay={1} sx={{ mt: 3 }}>
                <MuiLink
                  component={Link}
                  to="/about"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, fontWeight: 600 }}
                >
                  The full story
                  <ArrowForwardIcon fontSize="small" />
                </MuiLink>
              </RevealSection>
            </Box>

            <ImpactList />
          </Box>
        </Container>
      </Box>

      {/* stack */}
      <Box component="section" sx={pageSection}>
        <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
          <RevealSection>
            <Typography variant="h2">Tools of the trade</Typography>
          </RevealSection>
          <RevealSection delay={1}>
            <Typography sx={{ ...ledeSx, mx: 'auto' }}>
              The languages, frameworks, and platforms I reach for day to day.
            </Typography>
          </RevealSection>
        </Container>

        <RevealSection delay={2} sx={{ mt: { xs: 5, md: 7 } }}>
          <StackMarquee />
        </RevealSection>
      </Box>

      {/* squares */}
      <Box component="section" sx={pageSection}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { md: 'minmax(0, 1.1fr) auto' },
              alignItems: 'center',
              gap: { xs: 6, md: 10 },
              p: { xs: 3.5, sm: 5, md: 7 },
              borderRadius: '20px',
              border: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              backgroundImage: (theme) =>
                `radial-gradient(70% 90% at 100% 50%, ${primaryTint(theme, 0.12)}, transparent 70%)`,
            }}
          >
            <Box>
              <RevealSection>
                <Typography variant="h2">Squares, live on game day.</Typography>
              </RevealSection>
              <RevealSection delay={1}>
                <Typography sx={ledeSx}>
                  The classic football squares pool, online. One person sets up the board, friends
                  claim their squares from their phones, and the winning square lights up for
                  everyone the moment a quarter ends.
                </Typography>
              </RevealSection>
              <RevealSection delay={2} sx={{ mt: 4, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                <Button
                  component="a"
                  href="https://squares.maxhq.io"
                  target="_blank"
                  rel="noreferrer"
                  variant="contained"
                  size="large"
                  endIcon={<NorthEastIcon />}
                >
                  Play Squares
                </Button>
                <Button component={Link} to="/apps" variant="outlined" color="inherit" size="large">
                  How it plays
                </Button>
              </RevealSection>
            </Box>

            <RevealSection delay={1} variant="scale" sx={{ justifySelf: 'center' }}>
              <SquaresBoard />
            </RevealSection>
          </Box>
        </Container>
      </Box>

      {/* closing */}
      <Box
        component="section"
        sx={{ ...pageSection, position: 'relative', overflow: 'hidden', textAlign: 'center' }}
      >
        <Box
          aria-hidden
          sx={{
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
            background: (theme) => {
              const { palette } = theme.vars ?? theme;

              return `radial-gradient(45% 60% at 50% 100%, ${palette.heroGlow1}, transparent 70%)`;
            },
          }}
        />

        <Container maxWidth="md" sx={{ position: 'relative' }}>
          <RevealSection>
            <Typography variant="h2">Building something? Let&apos;s talk.</Typography>
          </RevealSection>
          <RevealSection delay={1}>
            <Typography sx={{ ...ledeSx, mx: 'auto' }}>
              Questions about anything here, or something you&apos;re building? I read every message
              and usually reply within a day or two.
            </Typography>
          </RevealSection>
          <RevealSection
            delay={2}
            sx={{ mt: 4.5, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1.5 }}
          >
            <Button
              component={Link}
              to="/contact"
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
            >
              Send a message
            </Button>
            <Button component={Link} to="/projects" variant="outlined" color="inherit" size="large">
              Browse the projects
            </Button>
          </RevealSection>
        </Container>
      </Box>
    </Box>
  );
}
