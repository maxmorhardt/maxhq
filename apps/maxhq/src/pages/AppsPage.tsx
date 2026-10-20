import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import BoltIcon from '@mui/icons-material/Bolt';
import DescriptionIcon from '@mui/icons-material/Description';
import GitHubIcon from '@mui/icons-material/GitHub';
import GoogleIcon from '@mui/icons-material/Google';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import ShieldIcon from '@mui/icons-material/Shield';
import { Box, Button, Card, Chip, Container, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import PhoneShowcase from '../components/apps/PhoneShowcase';
import StepTrack, { type TrackStep } from '../components/apps/StepTrack';
import PageMeta from '../components/common/PageMeta';
import RevealSection from '../components/common/RevealSection';
import { spotlightSx, useSpotlight } from '../hooks/useSpotlight';
import { fonts, pageSection } from '../theme';

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

const feed = [
  'JD claimed home 4, away 7',
  'Score update: away 7, home 14',
  'JD wins the 2nd quarter',
];

interface TileProps {
  icon: ReactNode;
  title: string;
  body: string;
  children?: ReactNode;
  wide?: boolean;
}

function Tile({ icon, title, body, children, wide = false }: TileProps) {
  const spotlight = useSpotlight();

  return (
    <RevealSection
      variant="rise"
      sx={{ display: 'flex', gridColumn: { md: wide ? 'span 2' : 'auto' } }}
    >
      <Card
        onPointerMove={spotlight.onPointerMove}
        sx={[(theme) => spotlightSx(theme), { flex: 1, p: { xs: 3, md: 3.5 } }]}
      >
        <Box sx={{ display: 'flex', color: 'primary.main' }}>{icon}</Box>
        <Typography variant="h3" sx={{ mt: 2, mb: 0.75 }}>
          {title}
        </Typography>
        <Typography sx={{ maxWidth: '46ch' }}>{body}</Typography>
        {children ? <Box sx={{ mt: 3 }}>{children}</Box> : null}
      </Card>
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

      {/* hero: the app on a phone */}
      <Box
        component="section"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          pt: { xs: 8, md: 12 },
          pb: { xs: 8, md: 10 },
        }}
      >
        <Box
          aria-hidden
          sx={{
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
            background: (theme) => {
              const { palette } = theme.vars ?? theme;

              return `radial-gradient(50% 40% at 50% 0%, ${palette.heroGlow1}, transparent 70%), radial-gradient(40% 40% at 50% 85%, ${palette.heroGlow2}, transparent 70%)`;
            },
            opacity: 0.8,
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', textAlign: 'center' }}>
          <RevealSection>
            <Typography variant="h1">Squares</Typography>
          </RevealSection>
          <RevealSection delay={1}>
            <Typography
              sx={{
                mt: 2.5,
                mx: 'auto',
                maxWidth: '54ch',
                fontSize: { xs: '1.05rem', md: '1.2rem' },
              }}
            >
              Football squares for the whole party. The classic Super Bowl pool, online: one person
              sets up the board, everyone claims their squares, and the live score calls the winner
              every quarter on everyone&apos;s phone.
            </Typography>
          </RevealSection>
          <RevealSection
            delay={2}
            sx={{ mt: 4, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1.5 }}
          >
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
            <Button
              href="#how-it-plays"
              variant="outlined"
              color="inherit"
              size="large"
              endIcon={<ArrowDownwardIcon />}
            >
              How it plays
            </Button>
          </RevealSection>

          <RevealSection delay={3} variant="rise" sx={{ mt: { xs: 7, md: 9 } }}>
            <PhoneShowcase />
          </RevealSection>
        </Container>
      </Box>

      {/* how it plays */}
      <Box component="section" id="how-it-plays" sx={pageSection}>
        <Container maxWidth="lg">
          <RevealSection>
            <Typography variant="h2" sx={{ mb: { xs: 4, md: 6 } }}>
              How a game plays out
            </Typography>
          </RevealSection>
          <RevealSection delay={1}>
            <StepTrack steps={steps} />
          </RevealSection>
        </Container>
      </Box>

      {/* made for playing together */}
      <Box component="section" sx={pageSection}>
        <Container maxWidth="lg">
          <RevealSection>
            <Typography variant="h2" sx={{ mb: { xs: 4, md: 6 } }}>
              Made for playing together
            </Typography>
          </RevealSection>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
              gap: 2.5,
            }}
          >
            <Tile
              wide
              icon={<BoltIcon />}
              title="Live updates"
              body="Squares, numbers, scores, and winners update instantly for everyone as the game unfolds."
            >
              <Box sx={{ display: 'grid', gap: 1 }}>
                {feed.map((line, i) => (
                  <Box
                    key={line}
                    sx={{
                      px: 1.75,
                      py: 1.1,
                      borderRadius: '10px',
                      bgcolor: 'codeBg',
                      fontFamily: fonts.mono,
                      fontSize: '0.78rem',
                      color: i === feed.length - 1 ? 'secondary.main' : 'text.secondary',
                    }}
                  >
                    {line}
                  </Box>
                ))}
              </Box>
            </Tile>

            <Tile
              icon={<PhoneIphoneIcon />}
              title="Nothing to install"
              body="Everyone joins from their own phone with just a link."
            />

            <Tile
              icon={<ShieldIcon />}
              title="One sign-in"
              body="Sign in once with Google or GitHub; the same account works across every maxhq app."
            >
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip icon={<GoogleIcon />} label="Google" variant="outlined" />
                <Chip icon={<GitHubIcon />} label="GitHub" variant="outlined" />
              </Box>
            </Tile>

            <RevealSection variant="rise" sx={{ gridColumn: { md: 'span 2' }, display: 'flex' }}>
              <Card sx={{ flex: 1, p: { xs: 3, md: 3.5 } }}>
                <Typography variant="h3" sx={{ mb: 0.75 }}>
                  Signing in
                </Typography>
                <Typography sx={{ lineHeight: 1.7, maxWidth: '68ch' }}>
                  Signing in is used only to create your account and identify you while you play.
                  maxhq requests your basic profile and email address and does not access anything
                  else in your Google or GitHub account. You can delete your account at any time
                  from within any app, which removes your personal data from maxhq.
                </Typography>
              </Card>
            </RevealSection>
          </Box>
        </Container>
      </Box>

      {/* legal */}
      <Box component="section" sx={{ ...pageSection, pt: 0 }}>
        <Container maxWidth="lg">
          <RevealSection
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 3,
              pt: 4,
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
