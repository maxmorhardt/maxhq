import BadgeIcon from '@mui/icons-material/Badge';
import BlockIcon from '@mui/icons-material/Block';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import DescriptionIcon from '@mui/icons-material/Description';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import MailOutlinedIcon from '@mui/icons-material/MailOutlined';
import ShieldIcon from '@mui/icons-material/Shield';
import { Box, Button, Container, Link as MuiLink, Typography } from '@mui/material';
import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';
import AppDirectory from '../components/apps/AppDirectory';
import AppShowcase, { type AppEntry } from '../components/apps/AppShowcase';
import SquaresBoard from '../components/apps/SquaresBoard';
import StepTrack from '../components/apps/StepTrack';
import PageMeta from '../components/common/PageMeta';
import RevealSection from '../components/common/RevealSection';
import { pageSection, primaryTint } from '../theme';

const apps: AppEntry[] = [
  {
    id: 'squares',
    name: 'Squares',
    tagline: 'Football squares for the whole party',
    icon: <Box component="img" src="/apps/squares.svg" alt="" sx={{ width: 28, height: 28 }} />,
    description:
      'The classic Super Bowl pool, online. One person sets up the board, everyone claims their squares from their phone, and the live score calls the winner every quarter.',
    href: 'https://squares.maxhq.io',
    status: 'Live',
    cta: 'Play Squares',
    features: [
      {
        title: 'Nothing to install',
        body: 'Everyone joins from their own phone with a link and claims squares on one shared board.',
      },
      {
        title: 'Live updates',
        body: 'Squares, numbers, scores, and winners update instantly for everyone as the game unfolds.',
      },
      {
        title: 'Linked to real games',
        body: 'Pick an NFL game and the board follows its score from kickoff to the final whistle.',
      },
    ],
    visual: (
      <Box sx={{ zoom: { xs: 1, md: 1.2 } }}>
        <SquaresBoard />
      </Box>
    ),
    extra: (
      <>
        <RevealSection>
          <Typography variant="h3" sx={{ mb: { xs: 4, md: 5 } }}>
            How a game plays out
          </Typography>
        </RevealSection>
        <RevealSection delay={1}>
          <StepTrack
            steps={[
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
            ]}
          />
        </RevealSection>
      </>
    ),
  },
];

// the accounts people can sign in with, and where each one lists the apps it has shared with
const providers = [
  { name: 'Google', access: 'https://myaccount.google.com/connections' },
  { name: 'GitHub', access: 'https://github.com/settings/applications' },
];

// "Google or GitHub", "Google, GitHub, or Apple"
const providerNames = new Intl.ListFormat('en', { type: 'disjunction' }).format(
  providers.map((provider) => provider.name)
);

// what a provider shares when someone signs in, and what each piece is for
const shared = [
  {
    icon: <BadgeIcon />,
    label: 'Your name',
    use: 'Shown on the boards, results, and leaderboards you take part in.',
  },
  {
    icon: <MailOutlinedIcon />,
    label: 'Your email address',
    use: 'Identifies your account. Other players see your name, and only the owner of a contest you join can see your email.',
  },
  {
    icon: <FingerprintIcon />,
    label: 'Your account ID',
    use: 'Links each sign-in to the same maxhq account so your contests and stats follow you.',
  },
];

const never = [
  'We never see or store the password to your sign-in account.',
  'We don’t read your email, files, contacts, repositories, or anything else in that account.',
  'We don’t sell your information or use it for advertising.',
  'We only share it with the services that run maxhq, as the Privacy Policy describes.',
];

function DataCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <RevealSection
      variant="rise"
      sx={{
        p: { xs: 3, md: 4 },
        borderRadius: '24px',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        height: '100%',
      }}
    >
      <Typography variant="h3" sx={{ mb: 2.5 }}>
        {title}
      </Typography>
      {children}
    </RevealSection>
  );
}

export default function AppsPage() {
  return (
    <Box>
      <PageMeta
        title="maxhq – Apps by Max Morhardt"
        description="maxhq is home to the apps Max Morhardt builds and runs, including Squares. See what each app does, how signing in works, and what happens to your data."
        canonical="https://maxhq.io/apps"
      />

      <Box
        component="header"
        sx={{
          pt: { xs: 8, md: 12 },
          pb: { xs: 6, md: 8 },
          backgroundImage: (theme) =>
            `radial-gradient(50% 60% at 15% 0%, ${primaryTint(theme, 0.14)}, transparent 70%)`,
        }}
      >
        <Container maxWidth="lg">
          <RevealSection>
            <Typography variant="h1">Apps</Typography>
          </RevealSection>
          <RevealSection delay={1}>
            <Typography
              sx={{ mt: 2.5, maxWidth: '58ch', fontSize: { md: '1.15rem' }, color: 'text.primary' }}
            >
              maxhq is the home of the web apps Max Morhardt builds and runs. Every one is free,
              runs in your browser, and uses the same maxhq account, so you sign in once with{' '}
              {providerNames} and you’re in.
            </Typography>
          </RevealSection>

          <Box sx={{ mt: { xs: 5, md: 6 } }}>
            <AppDirectory apps={apps} />
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ display: 'grid', gap: { xs: 8, md: 12 } }}>
        {apps.map((app, i) => (
          <AppShowcase key={app.id} app={app} flip={i % 2 === 1} />
        ))}
      </Container>

      {/* what signing in shares and what we do with it, kept here for the sign-in providers' app reviews */}
      <Box component="section" aria-labelledby="your-data-title" sx={pageSection}>
        <Container maxWidth="lg">
          <RevealSection sx={{ maxWidth: '62ch' }}>
            <Typography id="your-data-title" variant="h2">
              Your account and your data
            </Typography>
            <Typography sx={{ mt: 2 }}>
              Every maxhq app signs you in through one shared maxhq sign-in, using an account you
              already have with {providerNames}. Whichever you pick asks whether to share your name,
              email address, and basic profile with maxhq. That’s all we ask for, and here’s exactly
              what it’s used for.
            </Typography>
          </RevealSection>

          <Box
            sx={{
              mt: { xs: 5, md: 7 },
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
              gap: { xs: 2, md: 3 },
            }}
          >
            <DataCard title="What your sign-in shares with us">
              <Box component="dl" sx={{ m: 0, display: 'grid', gap: 2.5 }}>
                {shared.map((item) => (
                  <Box key={item.label} sx={{ display: 'flex', gap: 1.75 }}>
                    <Box
                      aria-hidden
                      sx={{
                        flexShrink: 0,
                        display: 'grid',
                        placeItems: 'center',
                        width: 40,
                        height: 40,
                        borderRadius: '12px',
                        color: 'primary.main',
                        bgcolor: (theme) => primaryTint(theme, 0.12),
                        '& svg': { fontSize: 20 },
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Box>
                      <Typography component="dt" sx={{ fontWeight: 650, color: 'text.primary' }}>
                        {item.label}
                      </Typography>
                      <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                        {item.use}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </DataCard>

            <DataCard title="What we never do">
              <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1.5 }}>
                {never.map((line) => (
                  <Box key={line} component="li" sx={{ display: 'flex', gap: 1.25 }}>
                    <BlockIcon sx={{ mt: '3px', fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2">{line}</Typography>
                  </Box>
                ))}
              </Box>
            </DataCard>

            <DataCard title="Leaving is easy">
              <Box sx={{ display: 'flex', gap: 1.25 }}>
                <DeleteOutlinedIcon sx={{ mt: '3px', fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2">
                  Delete your account anytime from your profile in any app, or email{' '}
                  <MuiLink href="mailto:support@maxhq.io">support@maxhq.io</MuiLink> and we’ll do it
                  for you. You can also remove maxhq’s access in your account settings with{' '}
                  {providers.map((provider, i) => (
                    <Fragment key={provider.name}>
                      {i > 0 && (i === providers.length - 1 ? ' or ' : ', ')}
                      <MuiLink href={provider.access} target="_blank" rel="noreferrer">
                        {provider.name}
                      </MuiLink>
                    </Fragment>
                  ))}
                  .
                </Typography>
              </Box>
            </DataCard>
          </Box>

          <RevealSection
            sx={{
              mt: { xs: 5, md: 7 },
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
              <Typography>
                The full details on how maxhq apps may be used and how your data is handled.
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
          </RevealSection>
        </Container>
      </Box>
    </Box>
  );
}
