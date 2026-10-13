import BoltIcon from '@mui/icons-material/Bolt';
import DnsIcon from '@mui/icons-material/Dns';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ShieldIcon from '@mui/icons-material/Shield';
import SyncIcon from '@mui/icons-material/Sync';
import { Avatar, Box, Container, Typography } from '@mui/material';
import type { ReactElement } from 'react';
import PageMeta from '../components/common/PageMeta';
import RevealSection from '../components/common/RevealSection';
import ProjectCard, { type Project } from '../components/projects/ProjectCard';
import { pageSection } from '../theme';

const platform: { icon: ReactElement; title: string; body: string }[] = [
  {
    icon: <ShieldIcon />,
    title: 'Federated single sign-on',
    body: 'One account works across every app, with Google and GitHub sign-in federated through a self-hosted Dex identity provider.',
  },
  {
    icon: <BoltIcon />,
    title: 'Real-time everywhere',
    body: 'Live grids, scores, and standings update instantly for everyone, powered by WebSockets fanned out across instances over NATS.',
  },
  {
    icon: <DnsIcon />,
    title: 'Self-hosted on Kubernetes',
    body: 'Every app runs on a self-managed k3s cluster behind a single Envoy gateway, with highly available Postgres, sealed secrets, and full observability.',
  },
  {
    icon: <SyncIcon />,
    title: 'Continuous delivery',
    body: 'Shared CI/CD pipelines and reusable Helm charts build and test every service the same way, then Argo CD syncs the cluster to match Git.',
  },
];

const projects: Project[] = [
  {
    name: 'squares',
    category: 'Frontend',
    description:
      'Real-time NFL squares platform built around a live grid that updates instantly as numbers are drawn and quarters end. Includes a contest state machine, automated winner calculation, and Google and GitHub sign-in through Dex.',
    href: 'https://github.com/maxmorhardt/squares',
    links: [{ label: 'Live site', href: 'https://squares.maxstash.io', icon: <OpenInNewIcon /> }],
    tags: ['React', 'TypeScript', 'Redux', 'MUI', 'SSG', 'OIDC', 'WebSocket'],
  },
  {
    name: 'squares-api',
    category: 'Backend',
    description:
      'Backend API that powers the Super Bowl squares game. Owns the contest lifecycle, persists state in PostgreSQL, and fans real-time updates out to every connected client. Documented with Swagger and protected with OIDC-validated JWTs.',
    href: 'https://github.com/maxmorhardt/squares-api',
    links: [
      { label: 'Swagger', href: 'https://api.maxstash.io/squares/swagger', icon: <MenuBookIcon /> },
    ],
    tags: ['Go', 'Gin', 'GORM', 'PostgreSQL', 'NATS', 'OIDC', 'Swagger'],
  },
  {
    name: 'k8s',
    category: 'Infrastructure',
    description:
      'Self-hosted k3s cluster that runs every app on this site: Argo CD keeps it in sync with this repo, Envoy Gateway fronts all traffic, and Dex federates Google and GitHub sign-in. Highly available Postgres, NATS messaging, Sealed Secrets, and a full metrics and logs stack back it all, with Terraform managing S3 remote state, Cloudflare DNS, and GitHub repo settings.',
    href: 'https://github.com/maxmorhardt/k8s',
    tags: [
      'Kubernetes',
      'Argo CD',
      'Terraform',
      'Envoy Gateway',
      'Dex',
      'Sealed Secrets',
      'PostgreSQL',
      'NATS',
    ],
  },
  {
    name: 'charts',
    category: 'Infrastructure',
    description:
      'Reusable Helm charts shared across all my app deployments. Each chart bundles the standard pieces (Deployment, Service, HTTPRoute, autoscaling, monitoring) so a new app only needs a values file. Keeps every workload in the cluster consistent.',
    href: 'https://github.com/maxmorhardt/charts',
    tags: ['Helm', 'Kubernetes', 'HPA', 'Gateway API', 'Prometheus'],
  },
  {
    name: 'workflows',
    category: 'CI/CD',
    description:
      'Reusable GitHub Actions workflows that build, test, and release every other repo. Covers Node, Go, Docker image publishing, and Helm releases, plus security scanning with Trivy and automated dependency updates with Renovate. Deploys are GitOps: a workflow bumps the Argo CD Application manifest and the cluster reconciles itself.',
    href: 'https://github.com/maxmorhardt/workflows',
    tags: ['GitHub Actions', 'Docker', 'Helm', 'Argo CD', 'Trivy', 'Renovate'],
  },
  {
    name: 'maxstash',
    category: 'Frontend',
    description:
      'This portfolio site. React 19 + Vite prerendered to static HTML with React Router framework mode, styled with Material UI and Emotion, with persistent light/dark theming and scroll-driven animations. Shipped as a Docker image through the same workflows that deploy everything else.',
    href: 'https://github.com/maxmorhardt/maxstash',
    links: [{ label: 'Live site', href: 'https://maxstash.io', icon: <OpenInNewIcon /> }],
    tags: ['React 19', 'TypeScript', 'Vite', 'SSG', 'Material UI', 'Emotion'],
  },
];

export default function ProjectsPage() {
  return (
    <Box component="section" sx={pageSection}>
      <PageMeta
        title="Projects – Max Morhardt"
        description="Explore Max Morhardt's projects: a real-time NFL squares app, a Go API, a self-hosted Kubernetes platform, reusable Helm charts, and GitHub Actions workflows."
        canonical="https://maxstash.io/projects"
      />

      <Container maxWidth="lg">
        <RevealSection>
          <Typography variant="h4" component="h1" gutterBottom>
            Projects
          </Typography>
        </RevealSection>

        <RevealSection delay={1}>
          <Typography color="text.secondary" sx={{ mb: 5, maxWidth: '62ch' }}>
            A connected ecosystem of frontends, APIs, and infrastructure I design, build, and
            self-host. The apps are the surface. Underneath, every project deploys to the same
            Kubernetes platform that runs this site, sharing sign-on, real-time messaging, and
            delivery pipelines.
          </Typography>
        </RevealSection>

        {/* under the hood: the shared platform, as an open media list (not cards) */}
        <RevealSection>
          <Typography variant="h3" component="h2" sx={{ mt: 6, mb: 3, fontSize: '1.4rem' }}>
            Under the hood
          </Typography>
        </RevealSection>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { sm: '1fr 1fr' },
            columnGap: 6,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          {platform.map((f) => (
            <RevealSection
              key={f.title}
              sx={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: 2,
                py: 3,
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              <Avatar variant="rounded" sx={{ bgcolor: 'action.hover', color: 'primary.main' }}>
                {f.icon}
              </Avatar>

              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h3" component="h3" sx={{ mb: 0.5, fontSize: '1.05rem' }}>
                  {f.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {f.body}
                </Typography>
              </Box>
            </RevealSection>
          ))}
        </Box>

        {/* the repositories */}
        <RevealSection>
          <Typography variant="h3" component="h2" sx={{ mt: 6, mb: 3, fontSize: '1.4rem' }}>
            The repositories
          </Typography>
        </RevealSection>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 2.5,
          }}
        >
          {projects.map((project, i) => (
            <ProjectCard
              key={project.name}
              project={project}
              rootMargin={i < 3 ? '0px 0px 15% 0px' : undefined}
            />
          ))}
        </Box>
      </Container>
    </Box>
  );
}
