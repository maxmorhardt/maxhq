import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BarChartIcon from '@mui/icons-material/BarChart';
import BoltIcon from '@mui/icons-material/Bolt';
import CloudIcon from '@mui/icons-material/Cloud';
import CodeIcon from '@mui/icons-material/Code';
import DnsIcon from '@mui/icons-material/Dns';
import GitHubIcon from '@mui/icons-material/GitHub';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ListIcon from '@mui/icons-material/List';
import LockIcon from '@mui/icons-material/Lock';
import PaletteIcon from '@mui/icons-material/Palette';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import ShieldIcon from '@mui/icons-material/Shield';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import StorageIcon from '@mui/icons-material/Storage';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SyncIcon from '@mui/icons-material/Sync';
import WidgetsIcon from '@mui/icons-material/Widgets';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Paper,
  Typography,
} from '@mui/material';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import HeroTerminal from '../components/common/HeroTerminal';
import PageMeta from '../components/common/PageMeta';
import RevealSection from '../components/common/RevealSection';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { easing, layout, pageSection } from '../theme';

const icons = {
  server: <DnsIcon fontSize="small" />,
  code: <CodeIcon fontSize="small" />,
  bolt: <BoltIcon fontSize="small" />,
  database: <StorageIcon fontSize="small" />,
  component: <WidgetsIcon fontSize="small" />,
  palette: <PaletteIcon fontSize="small" />,
  sync: <SyncIcon fontSize="small" />,
  box: <Inventory2Icon fontSize="small" />,
  cloud: <CloudIcon fontSize="small" />,
  chartLine: <ShowChartIcon fontSize="small" />,
  chartBar: <BarChartIcon fontSize="small" />,
  list: <ListIcon fontSize="small" />,
  shield: <ShieldIcon fontSize="small" />,
  lock: <LockIcon fontSize="small" />,
  gateway: <SwapHorizIcon fontSize="small" />,
  cog: <SettingsIcon fontSize="small" />,
  github: <GitHubIcon fontSize="small" />,
  refresh: <RefreshIcon fontSize="small" />,
};

const stack: { name: string; icon: ReactElement }[] = [
  { name: 'Java', icon: icons.server },
  { name: 'TypeScript', icon: icons.code },
  { name: 'Go', icon: icons.bolt },
  { name: 'Python', icon: icons.code },
  { name: 'SQL', icon: icons.database },
  { name: 'Spring Boot', icon: icons.server },
  { name: 'Gin', icon: icons.bolt },
  { name: 'GORM', icon: icons.database },
  { name: 'JPA', icon: icons.database },
  { name: 'React', icon: icons.component },
  { name: 'Angular', icon: icons.code },
  { name: 'Vite', icon: icons.bolt },
  { name: 'PrimeNG', icon: icons.component },
  { name: 'Material UI', icon: icons.palette },
  { name: 'PostgreSQL', icon: icons.database },
  { name: 'NATS', icon: icons.sync },
  { name: 'WebSockets', icon: icons.bolt },
  { name: 'Docker', icon: icons.box },
  { name: 'Kubernetes', icon: icons.server },
  { name: 'k3s', icon: icons.server },
  { name: 'Helm', icon: icons.box },
  { name: 'Argo CD', icon: icons.sync },
  { name: 'Terraform', icon: icons.cog },
  { name: 'AWS', icon: icons.cloud },
  { name: 'EKS', icon: icons.server },
  { name: 'EC2', icon: icons.server },
  { name: 'S3', icon: icons.database },
  { name: 'EFS', icon: icons.database },
  { name: 'Lambda', icon: icons.bolt },
  { name: 'DynamoDB', icon: icons.database },
  { name: 'CloudWatch', icon: icons.chartLine },
  { name: 'CloudFormation', icon: icons.cloud },
  { name: 'Jenkins', icon: icons.cog },
  { name: 'GitHub Actions', icon: icons.github },
  { name: 'Renovate', icon: icons.refresh },
  { name: 'Datadog', icon: icons.chartLine },
  { name: 'Prometheus', icon: icons.chartLine },
  { name: 'Grafana', icon: icons.chartBar },
  { name: 'Loki', icon: icons.list },
  { name: 'Dex', icon: icons.shield },
  { name: 'Sealed Secrets', icon: icons.lock },
  { name: 'Envoy Gateway', icon: icons.gateway },
  { name: 'Cloudflare', icon: icons.cloud },
  { name: 'Bash', icon: icons.code },
];

const highlights = [
  {
    title: 'Full-stack engineering',
    body: 'Java + Spring Boot and Go + Gin services behind Angular and React interfaces, designed, tested, and shipped end to end.',
    icon: <AccountTreeIcon />,
  },
  {
    title: 'Cloud and Kubernetes platforms',
    body: 'Multi-tenant developer platforms on AWS and EKS, with Spring Boot APIs orchestrating Kubernetes workloads for thousands of users, plus AI gateway work on Go and Envoy AI Gateway for multi-provider LLM routing.',
    icon: <DnsIcon />,
  },
  {
    title: 'Real-time and self-hosted systems',
    body: 'A production k3s cluster fronted by Envoy Gateway, with Dex federated sign-in, highly available PostgreSQL, and NATS pub/sub for horizontally scaled WebSocket broadcasting, delivered continuously through Argo CD GitOps.',
    icon: <BoltIcon />,
  },
];

// keeps the h1 available to screen readers and crawlers without showing it
const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;

export default function HomePage() {
  const chips = useScrollReveal<HTMLDivElement>();

  return (
    <Box>
      <PageMeta
        title="Max Morhardt – Software Engineer"
        description="Max Morhardt is a Software Engineer at Fidelity Investments specializing in Java, Spring Boot, Go, TypeScript, React, Angular, Kubernetes, Terraform, and AWS."
        canonical="https://maxstash.io/"
      />

      {/* hero */}
      <Box
        component="section"
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          minHeight: `calc(100svh - ${layout.headerHeight.lg})`,
          py: { xs: 3, md: 6 },
        }}
      >
        {/* ambient background glows */}
        <Box aria-hidden sx={{ pointerEvents: 'none', position: 'absolute', inset: 0 }}>
          {[
            { size: 520, bg: 'heroGlow1', pos: { top: -120, left: -120 }, speed: '12s' },
            { size: 460, bg: 'heroGlow2', pos: { bottom: -160, right: -120 }, speed: '14s' },
          ].map((glow) => (
            <Box
              key={glow.bg}
              sx={{
                position: 'absolute',
                ...glow.pos,
                width: glow.size,
                height: glow.size,
                borderRadius: '50%',
                filter: 'blur(100px)',
                opacity: 0.7,
                bgcolor: glow.bg,
                animation: `float ${glow.speed} ease-in-out infinite`,
                '@keyframes float': {
                  '0%, 100%': { transform: 'translate(0, 0)' },
                  '50%': { transform: 'translate(40px, 30px)' },
                },
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
              }}
            />
          ))}
        </Box>

        <Container
          maxWidth="lg"
          sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}
        >
          <Typography variant="h1" sx={visuallyHidden}>
            Max Morhardt, Software Engineer
          </Typography>

          <RevealSection sx={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
            <HeroTerminal />
          </RevealSection>
        </Container>

        {/* scroll affordance */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            color: 'text.secondary',
            opacity: 0.5,
            display: { xs: 'none', md: 'block' },
            animation: 'bounce 2.4s ease-in-out infinite',
            '@keyframes bounce': {
              '0%, 100%': { transform: 'translate(-50%, 0)' },
              '50%': { transform: 'translate(-50%, 8px)' },
            },
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
              transform: 'translateX(-50%)',
            },
          }}
        >
          <KeyboardArrowDownIcon />
        </Box>
      </Box>

      {/* highlights */}
      <Divider />
      <Box component="section" sx={{ ...pageSection, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <RevealSection>
            <Typography variant="h2" align="center" gutterBottom>
              What I do
            </Typography>
          </RevealSection>

          <RevealSection delay={1}>
            <Typography
              align="center"
              color="text.secondary"
              sx={{ mx: 'auto', mb: 6, maxWidth: '56ch' }}
            >
              A few areas where I spend most of my engineering time.
            </Typography>
          </RevealSection>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2.5 }}>
            {highlights.map((h, i) => (
              <RevealSection
                key={h.title}
                delay={(i + 1) as 1 | 2 | 3}
                variant="rise"
                sx={{ display: 'flex', minWidth: 0, maxWidth: 360, flex: '1 1 280px' }}
              >
                <Card
                  sx={{
                    flex: 1,
                    bgcolor: 'background.default',
                    '&:hover': { transform: 'translateY(-4px)', borderColor: 'primary.main' },
                    '@media (prefers-reduced-motion: reduce)': { '&:hover': { transform: 'none' } },
                  }}
                >
                  <CardContent>
                    <Avatar
                      variant="rounded"
                      sx={{ mb: 2, bgcolor: 'action.hover', color: 'primary.main' }}
                    >
                      {h.icon}
                    </Avatar>
                    <Typography variant="h3" component="h3" gutterBottom>
                      {h.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {h.body}
                    </Typography>
                  </CardContent>
                </Card>
              </RevealSection>
            ))}
          </Box>
        </Container>
      </Box>
      <Divider />

      {/* stack chips */}
      <Box component="section" sx={pageSection}>
        <Container maxWidth="lg">
          <RevealSection>
            <Typography variant="h2" align="center" gutterBottom>
              Tools of the trade
            </Typography>
          </RevealSection>

          <RevealSection delay={1}>
            <Typography
              align="center"
              color="text.secondary"
              sx={{ mx: 'auto', mb: 6, maxWidth: '56ch' }}
            >
              Day-to-day languages, frameworks, and platforms.
            </Typography>
          </RevealSection>

          <Box
            ref={chips.ref}
            sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}
          >
            {stack.map((item, i) => (
              <Chip
                key={item.name}
                icon={item.icon}
                label={item.name}
                variant="outlined"
                sx={{
                  // chips stagger in once the row scrolls into view
                  opacity: 0,
                  ...(chips.visible && {
                    animation: `chip-reveal 0.4s ${easing.reveal} both`,
                    animationDelay: `${i * 45}ms`,
                  }),
                  '@keyframes chip-reveal': {
                    from: { opacity: 0, transform: 'translateY(12px)' },
                    to: { opacity: 1, transform: 'none' },
                  },
                  '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
                  '@media (prefers-reduced-motion: reduce)': { opacity: 1, animation: 'none' },
                }}
              />
            ))}
          </Box>
        </Container>
      </Box>

      {/* editorial statement: a heading/body spread, deliberately not a card grid */}
      <Divider />
      <Box component="section" sx={{ ...pageSection, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'grid',
              gap: { xs: 3, md: 6 },
              gridTemplateColumns: { md: '13rem 1fr' },
              alignItems: 'start',
            }}
          >
            <RevealSection>
              <Typography variant="h3" component="h2">
                How I work
              </Typography>
            </RevealSection>

            <RevealSection
              delay={1}
              sx={{
                borderLeft: { md: 2 },
                borderColor: { md: 'primary.main' },
                pl: { md: 4 },
              }}
            >
              <Typography
                sx={{
                  fontSize: 'clamp(1.3rem, 2.4vw, 1.8rem)',
                  fontWeight: 500,
                  lineHeight: 1.45,
                  color: 'text.primary',
                }}
              >
                At Fidelity, I build multi-tenant developer platforms end to end:{' '}
                <Box component="em" sx={{ fontStyle: 'normal', color: 'primary.main' }}>
                  Spring Boot services and Angular interfaces
                </Box>
                , built and deployed to EKS through Jenkins pipelines for thousands of engineers.
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 2.5, fontSize: '1.1rem' }}>
                Beyond that, I self-host every app on this site on a Kubernetes cluster I run and
                maintain myself.
              </Typography>
            </RevealSection>
          </Box>
        </Container>
      </Box>
      <Divider />

      {/* cta */}
      <Box component="section" sx={pageSection}>
        <Container maxWidth="lg">
          <RevealSection variant="rise">
            <Paper
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                textAlign: 'center',
                py: 7,
                px: 4,
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="h2">Get in touch</Typography>

              <Typography color="text.secondary" sx={{ maxWidth: '50ch' }}>
                Questions about anything here, or something you&apos;re building? I read every
                message and usually reply within a day or two.
              </Typography>

              <Box
                sx={{
                  mt: 2,
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 1.5,
                }}
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

                <Button component={Link} to="/projects" variant="outlined" size="large">
                  Browse the projects
                </Button>
              </Box>
            </Paper>
          </RevealSection>
        </Container>
      </Box>
    </Box>
  );
}
