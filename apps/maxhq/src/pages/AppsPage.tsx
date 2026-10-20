import DescriptionIcon from '@mui/icons-material/Description';
import GitHubIcon from '@mui/icons-material/GitHub';
import GoogleIcon from '@mui/icons-material/Google';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import ShieldIcon from '@mui/icons-material/Shield';
import { Box, Button, Container, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import SquaresBoard from '../components/apps/SquaresBoard';
import StepTrack, { type TrackStep } from '../components/apps/StepTrack';
import PageMeta from '../components/common/PageMeta';
import RevealSection from '../components/common/RevealSection';
import { fonts, pageSection, primaryTint } from '../theme';

const steps: TrackStep[] = [
  {
    title: 'Set up the board',
    body: 'Create a pool for an upcoming NFL game and share the link with everyone playing.',
  },
  {
    title: 'Friends claim squares',
    body: 'Everyone joins from their own phone and grabs the squares they want on the shared board.',
  },
  {
    title: 'Numbers are drawn',
    body: 'Once the board fills up, the app randomly assigns the digits 0–9 to every row and column.',
  },
  {
    title: 'Winners light up',
    body: 'As each quarter ends, the live score picks the winning square and it lights up for everyone.',
  },
];

const facts = [
  { label: 'Status', value: 'Live at squares.maxhq.io' },
  { label: 'Scores', value: 'Linked to live NFL games' },
  { label: 'Stack', value: 'Go · React · Kubernetes' },
  { label: 'Sign-in', value: 'Google or GitHub' },
];

const feed = [
  { time: '7:02 PM', text: 'JD claimed home 4, away 7' },
  { time: '8:20 PM', text: 'Numbers drawn, game on' },
  { time: '9:41 PM', text: 'Score update: away 7, home 14' },
  { time: '9:43 PM', text: 'JD wins the 2nd quarter' },
];

interface PanelProps {
  title: string;
  body: string;
  children: ReactNode;
}

// one feature, shown at work on its own stage with its caption beneath
function Panel({ title, body, children }: PanelProps) {
  return (
    <RevealSection variant="rise" component="article">
      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          minHeight: { xs: 300, md: 380 },
          p: { xs: 3, md: 5 },
          borderRadius: '20px',
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          backgroundImage: (theme) =>
            `radial-gradient(60% 70% at 50% 0%, ${primaryTint(theme, 0.12)}, transparent 70%)`,
        }}
      >
        {children}
      </Box>
      <Box sx={{ mt: 2.5, px: 0.5 }}>
        <Typography variant="h3" sx={{ mb: 0.75 }}>
          {title}
        </Typography>
        <Typography sx={{ maxWidth: '56ch' }}>{body}</Typography>
      </Box>
    </RevealSection>
  );
}

export default function AppsPage() {
  return (
    <Box>
      <PageMeta
        title="maxhq – Apps by Max Morhardt"
        description="maxhq is home to the apps Max Morhardt builds and runs for game day and get-togethers, including Squares. Start a game, share the link, and everyone plays along live."
        canonical="https://maxhq.io/apps"
      />

      <Container
        maxWidth="lg"
        sx={{
          pt: { xs: 8, md: 12 },
          pb: pageSection.py,
          display: 'grid',
          gridTemplateColumns: { md: 'minmax(0, 0.85fr) minmax(0, 1.15fr)' },
          gap: { xs: 7, md: 10 },
          alignItems: 'start',
        }}
      >
        {/* the app, pinned while its features scroll past */}
        <Box sx={{ position: { md: 'sticky' }, top: { md: 110 } }}>
          <RevealSection>
            <Typography variant="h1">Squares</Typography>
          </RevealSection>
          <RevealSection delay={1}>
            <Typography sx={{ mt: 2, color: 'text.primary', fontSize: '1.25rem', fontWeight: 560 }}>
              Football squares for the whole party
            </Typography>
            <Typography sx={{ mt: 1.5, maxWidth: '46ch', fontSize: { md: '1.08rem' } }}>
              The classic Super Bowl pool, online. One person sets up the board, everyone claims
              their squares from their phone, and the live score calls the winner every quarter.
            </Typography>
          </RevealSection>
          <RevealSection delay={2} sx={{ mt: 4 }}>
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
          </RevealSection>

          <RevealSection
            delay={2}
            component="dl"
            sx={{ mt: 5, mb: 0, borderTop: 1, borderColor: 'divider' }}
          >
            {facts.map((fact) => (
              <Box
                key={fact.label}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '7rem 1fr',
                  gap: 2,
                  py: 1.5,
                  borderBottom: 1,
                  borderColor: 'divider',
                }}
              >
                <Typography component="dt" sx={{ fontSize: '0.88rem' }}>
                  {fact.label}
                </Typography>
                <Typography
                  component="dd"
                  sx={{ m: 0, fontSize: '0.88rem', color: 'text.primary', fontWeight: 560 }}
                >
                  {fact.value}
                </Typography>
              </Box>
            ))}
          </RevealSection>
        </Box>

        {/* the app at work, one feature per panel */}
        <Box sx={{ display: 'grid', gap: { xs: 6, md: 8 } }}>
          <Panel
            title="Nothing to install"
            body="Everyone joins from their own phone with just a link, and claims squares on one shared board."
          >
            <Box sx={{ zoom: { xs: 1, md: 1.25 } }}>
              <SquaresBoard />
            </Box>
          </Panel>

          <Panel
            title="Live updates"
            body="Squares, numbers, scores, and winners update instantly for everyone as the game unfolds."
          >
            <Box
              component="ol"
              sx={{
                m: 0,
                p: 0,
                listStyle: 'none',
                width: '100%',
                maxWidth: 420,
                display: 'grid',
                gap: 1,
              }}
            >
              {feed.map((line, i) => (
                <Box
                  key={line.text}
                  component="li"
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 2,
                    px: 2,
                    py: 1.25,
                    borderRadius: '12px',
                    border: 1,
                    borderColor: i === feed.length - 1 ? 'primary.main' : 'divider',
                    bgcolor: 'background.default',
                    fontFamily: fonts.mono,
                    fontSize: '0.8rem',
                    color: i === feed.length - 1 ? 'primary.main' : 'text.primary',
                  }}
                >
                  <span>{line.text}</span>
                  <Box component="span" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {line.time}
                  </Box>
                </Box>
              ))}
            </Box>
          </Panel>

          <Panel
            title="One sign-in"
            body="Sign in once with Google or GitHub; the same account works across every maxhq app. Only your basic profile and email are requested, and you can delete your account from within any app."
          >
            <Box sx={{ width: '100%', maxWidth: 320, display: 'grid', gap: 1.25 }}>
              {[
                { label: 'Continue with Google', icon: <GoogleIcon fontSize="small" /> },
                { label: 'Continue with GitHub', icon: <GitHubIcon fontSize="small" /> },
              ].map((provider) => (
                <Box
                  key={provider.label}
                  aria-hidden
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1.25,
                    py: 1.4,
                    borderRadius: '12px',
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.default',
                    color: 'text.primary',
                    fontWeight: 600,
                    fontSize: '0.92rem',
                  }}
                >
                  {provider.icon}
                  {provider.label}
                </Box>
              ))}
            </Box>
          </Panel>
        </Box>
      </Container>

      {/* how it plays */}
      <Box component="section" sx={{ ...pageSection, pt: 0 }}>
        <Container maxWidth="lg">
          <RevealSection>
            <Typography variant="h2" sx={{ mb: { xs: 4, md: 6 } }}>
              How a game plays out
            </Typography>
          </RevealSection>
          <RevealSection delay={1}>
            <StepTrack steps={steps} />
          </RevealSection>

          <RevealSection
            sx={{
              mt: { xs: 8, md: 12 },
              pt: 4,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 3,
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            <Box>
              <Typography variant="h3" component="h2" sx={{ mb: 0.5 }}>
                Terms &amp; policies
              </Typography>
              <Typography>How maxhq apps may be used and how your data is handled.</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              <Button
                component={Link}
                to="/terms-of-service"
                variant="outlined"
                color="inherit"
                startIcon={<DescriptionIcon />}
              >
                Terms of Service
              </Button>
              <Button
                component={Link}
                to="/privacy-policy"
                variant="outlined"
                color="inherit"
                startIcon={<ShieldIcon />}
              >
                Privacy Policy
              </Button>
            </Box>
          </RevealSection>
        </Container>
      </Box>
    </Box>
  );
}
