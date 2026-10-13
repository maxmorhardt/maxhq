import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BoltIcon from '@mui/icons-material/Bolt';
import DescriptionIcon from '@mui/icons-material/Description';
import GridViewIcon from '@mui/icons-material/GridView';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import ShieldIcon from '@mui/icons-material/Shield';
import { Avatar, Box, Button, Chip, Container, Divider, Paper, Typography } from '@mui/material';

import type { ReactElement } from 'react';
import { Link } from 'react-router';
import SquaresBoard from '../components/apps/SquaresBoard';
import PageMeta from '../components/common/PageMeta';
import RevealSection from '../components/common/RevealSection';
import { fonts, pageSection, primaryTint } from '../theme';

interface Step {
  title: string;
  body: string;
}

interface AppShowcase {
  name: string;
  icon: ReactElement;
  eyebrow: string;
  tagline: string;
  description: string;
  cta: string;
  href: string;
  visual: 'squares-board' | 'icon';
  stepsTitle: string;
  steps: Step[];
}

const apps: AppShowcase[] = [
  {
    name: 'Squares',
    icon: <GridViewIcon />,
    eyebrow: 'Live app',
    tagline: 'Football squares for the whole party',
    description:
      "The classic Super Bowl squares pool, online. One person sets up the board, everyone claims their squares, and the app draws the numbers and calls the winner every quarter, live on everyone's phone.",
    cta: 'Play Squares',
    href: 'https://squares.maxstash.io',
    visual: 'squares-board',
    stepsTitle: 'How a game plays out',
    steps: [
      {
        title: 'Set up the board',
        body: 'Create a pool for an upcoming football game and share the link with everyone playing.',
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
        body: 'As each quarter ends, the app matches the score and the winning square lights up for everyone.',
      },
    ],
  },
];

const perks: { icon: ReactElement; title: string; body: string }[] = [
  {
    icon: <PhoneIphoneIcon />,
    title: 'Nothing to install',
    body: 'Everyone joins from their own phone with just a link.',
  },
  {
    icon: <ShieldIcon />,
    title: 'One sign-in',
    body: 'Sign in once with Google or GitHub; the same account works across every maxstash app.',
  },
  {
    icon: <BoltIcon />,
    title: 'Live updates',
    body: 'Squares, numbers, and winners update instantly for everyone as the game unfolds.',
  },
];

const sectionHeadingSx = { mt: 6, mb: 1, fontSize: '1.4rem' } as const;

export default function AppsPage() {
  return (
    <Box component="section">
      <PageMeta
        title="maxstash – Apps by Max Morhardt"
        description="maxstash is home to the apps Max Morhardt builds and runs for game day and get-togethers, including Squares. Start a game, share the link, and everyone plays along live."
        canonical="https://maxstash.io/apps"
      />

      {/* one showcase per app: a split hero followed by its play-by-play timeline */}
      {apps.map((app, ai) => {
        const flipped = ai % 2 === 1;

        return (
          <Box key={app.name}>
            {ai > 0 ? <Divider /> : null}

            <Container
              maxWidth="lg"
              sx={{
                display: 'grid',
                alignItems: 'center',
                gap: 6,
                py: 8,
                gridTemplateColumns: { md: flipped ? 'auto 1.1fr' : '1.1fr auto' },
              }}
            >
              <Box sx={{ order: { md: flipped ? 2 : 0 } }}>
                <RevealSection>
                  <Chip
                    label={app.eyebrow}
                    color="primary"
                    variant="outlined"
                    size="small"
                    sx={{
                      fontFamily: fonts.mono,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                    }}
                  />
                </RevealSection>

                <RevealSection delay={1}>
                  <Typography
                    variant="h1"
                    component={ai === 0 ? 'h1' : 'h2'}
                    sx={{ mt: 2.5, mb: 1.5, fontSize: 'clamp(2.75rem, 7vw, 4.25rem)' }}
                  >
                    {app.name}
                  </Typography>
                </RevealSection>

                <RevealSection delay={1}>
                  <Typography color="primary" sx={{ mb: 2, fontFamily: fonts.mono }}>
                    {app.tagline}
                  </Typography>
                </RevealSection>

                <RevealSection delay={2}>
                  <Typography
                    color="text.secondary"
                    sx={{ maxWidth: '46ch', fontSize: '1.05rem', lineHeight: 1.7 }}
                  >
                    {app.description}
                  </Typography>
                </RevealSection>

                <RevealSection delay={2} sx={{ mt: 4 }}>
                  <Button
                    component="a"
                    href={app.href}
                    target="_blank"
                    rel="noreferrer"
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForwardIcon />}
                  >
                    {app.cta}
                  </Button>
                </RevealSection>
              </Box>

              <RevealSection
                delay={1}
                sx={{
                  display: { xs: 'none', md: 'block' },
                  justifySelf: flipped ? 'start' : 'end',
                }}
              >
                {app.visual === 'squares-board' ? (
                  <SquaresBoard />
                ) : (
                  <Paper
                    aria-hidden
                    sx={{
                      display: 'grid',
                      placeItems: 'center',
                      gap: 2,
                      width: 'min(340px, 100%)',
                      aspectRatio: '1',
                      borderColor: 'primary.main',
                      bgcolor: (theme) => primaryTint(theme, 0.08),
                    }}
                  >
                    <Avatar
                      variant="rounded"
                      sx={{
                        width: 72,
                        height: 72,
                        bgcolor: 'background.default',
                        color: 'primary.main',
                      }}
                    >
                      {app.icon}
                    </Avatar>
                    <Typography
                      align="center"
                      variant="body2"
                      color="text.secondary"
                      sx={{ maxWidth: '22ch', fontFamily: fonts.mono }}
                    >
                      {app.tagline}
                    </Typography>
                  </Paper>
                )}
              </RevealSection>
            </Container>

            <Divider />

            {/* how it plays: a connected timeline rather than a card grid */}
            <Container maxWidth="lg" sx={{ py: 2 }}>
              <RevealSection>
                <Typography variant="h3" component="h2" sx={sectionHeadingSx}>
                  {app.stepsTitle}
                </Typography>
              </RevealSection>

              <Box
                component="ol"
                sx={{ position: 'relative', m: 0, mt: 4, mb: 2, p: 0, listStyle: 'none' }}
              >
                {app.steps.map((step, i) => {
                  const last = i === app.steps.length - 1;

                  return (
                    <RevealSection
                      key={step.title}
                      component="li"
                      delay={Math.min(i + 1, 4) as 1 | 2 | 3 | 4}
                      rootMargin="0px 0px 15% 0px"
                      sx={{
                        position: 'relative',
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr',
                        gap: 2,
                        pb: last ? 0 : 4,

                        // connector line linking the numbered nodes
                        ...(!last && {
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: '2.4rem',
                            bottom: '-0.2rem',
                            left: '1.2rem',
                            width: 2,
                            bgcolor: 'divider',
                          },
                        }),
                      }}
                    >
                      <Avatar
                        sx={{
                          zIndex: 1,
                          width: 40,
                          height: 40,
                          bgcolor: (theme) => primaryTint(theme, 0.12),
                          color: 'primary.main',
                          fontFamily: fonts.mono,
                          fontSize: '0.95rem',
                          fontWeight: 600,
                        }}
                      >
                        {i + 1}
                      </Avatar>

                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="h3"
                          component="h3"
                          sx={{ mb: 0.5, fontSize: '1.1rem' }}
                        >
                          {step.title}
                        </Typography>
                        <Typography color="text.secondary" sx={{ maxWidth: '52ch' }}>
                          {step.body}
                        </Typography>
                      </Box>
                    </RevealSection>
                  );
                })}
              </Box>
            </Container>
          </Box>
        );
      })}

      <Container maxWidth="lg" sx={{ ...pageSection, py: 2 }}>
        {/* made for playing together: a compact divided strip, not lift cards */}
        <RevealSection>
          <Typography variant="h3" component="h2" sx={sectionHeadingSx}>
            Made for playing together
          </Typography>
        </RevealSection>

        <RevealSection delay={1}>
          <Paper
            sx={{
              mt: 3,
              display: 'grid',
              gridTemplateColumns: { sm: 'repeat(3, 1fr)' },
              overflow: 'hidden',
              // the 1px gap is the divider; responsive border shorthands lose their color
              gap: '1px',
              bgcolor: 'divider',
            }}
          >
            {perks.map((perk) => (
              <Box key={perk.title} sx={{ p: 3, bgcolor: 'background.paper' }}>
                <Avatar variant="rounded" sx={{ bgcolor: 'action.hover', color: 'primary.main' }}>
                  {perk.icon}
                </Avatar>

                <Typography variant="h3" component="h3" sx={{ mt: 1.5, mb: 0.5, fontSize: '1rem' }}>
                  {perk.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {perk.body}
                </Typography>
              </Box>
            ))}
          </Paper>
        </RevealSection>

        {/* signing in: OAuth transparency about what data is used */}
        <RevealSection>
          <Typography variant="h3" component="h2" sx={sectionHeadingSx}>
            Signing in
          </Typography>
        </RevealSection>

        <RevealSection delay={1} sx={{ maxWidth: '68ch' }}>
          <Typography color="text.secondary" sx={{ mt: 1, mb: 2, lineHeight: 1.7 }}>
            When an app needs an account, you can sign in with Google or GitHub. One sign-in works
            across every maxstash app, so you never make a separate account per game. Signing in is
            used only to create your account and identify you while you play. maxstash requests your
            basic profile and email address and does not access anything else in your Google or
            GitHub account.
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
            You can delete your account at any time from within any app, which removes your personal
            data from maxstash.
          </Typography>
        </RevealSection>

        {/* legal */}
        <RevealSection>
          <Paper
            sx={{
              mt: 5,
              mb: 4,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 3,
              p: 3.5,
              bgcolor: 'background.paper',
            }}
          >
            <Box>
              <Typography variant="h3" component="h2" sx={{ mb: 0.5, fontSize: '1.2rem' }}>
                Terms &amp; policies
              </Typography>
              <Typography color="text.secondary">
                How maxstash apps may be used and how your data is handled.
              </Typography>
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
          </Paper>
        </RevealSection>
      </Container>
    </Box>
  );
}
