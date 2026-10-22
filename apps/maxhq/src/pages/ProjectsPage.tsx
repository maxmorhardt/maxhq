import GitHubIcon from '@mui/icons-material/GitHub';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Container, Link as MuiLink, Typography } from '@mui/material';
import PageHeader from '../components/common/PageHeader';
import PageMeta from '../components/common/PageMeta';
import RevealSection from '../components/common/RevealSection';
import ProjectRow, { type Project } from '../components/projects/ProjectRow';
import { pageSection } from '../theme';

const projects: Project[] = [
  {
    name: 'squares',
    category: 'App',
    description:
      'Real-time NFL squares: a live board that fills in for every player at once, numbers drawn at kickoff, and quarter winners called from the live score. Every game of the season with scores by quarter, a leaderboard, invite links, and Google and GitHub sign-in.',
    href: 'https://github.com/maxmorhardt/maxhq/tree/main/apps/squares/web',
    links: [{ label: 'Live site', href: 'https://squares.maxhq.io', icon: <OpenInNewIcon /> }],
    tags: ['React', 'TypeScript', 'Redux', 'MUI', 'SSE', 'OIDC'],
  },
  {
    name: 'squares services',
    category: 'Backend',
    description:
      'Four Go services behind the game: contests, games (the season schedule and live scores from ESPN), accounts, and realtime. Each owns its schema and publishes changes through a transactional outbox to Valkey streams, which realtime fans out to viewers over server-sent events.',
    href: 'https://github.com/maxmorhardt/maxhq/tree/main/apps/squares',
    links: [
      {
        label: 'Swagger',
        href: 'https://api.maxhq.io/squares/swagger/contests',
        icon: <MenuBookIcon />,
      },
    ],
    tags: ['Go', 'Gin', 'GORM', 'PostgreSQL', 'Valkey', 'SSE'],
  },
  {
    name: 'maxhq.io',
    category: 'App',
    description:
      'This site: React 19 prerendered to static HTML with React Router framework mode, Material UI and Emotion, light and dark themes, and scroll-driven animation. It lives in the maxhq monorepo beside squares, and ships through the same pipeline as everything else.',
    href: 'https://github.com/maxmorhardt/maxhq/tree/main/apps/maxhq',
    links: [{ label: 'Live site', href: 'https://maxhq.io', icon: <OpenInNewIcon /> }],
    tags: ['React 19', 'TypeScript', 'Vite', 'SSG', 'Material UI'],
  },
  {
    name: 'charts',
    category: 'Packaging',
    description:
      'A Helm chart for every app, versioned and released on its own to the GitHub container registry. They share one shape (Deployment, HTTPRoute, autoscaling, disruption budgets, network policies, and gateway auth and rate limits), so every workload deploys the same way.',
    href: 'https://github.com/maxmorhardt/maxhq/tree/main/charts',
    tags: ['Helm', 'Kubernetes', 'Gateway API', 'Envoy Gateway', 'GHCR'],
  },
  {
    name: 'gitops',
    category: 'Infrastructure',
    description:
      'The desired state of the dev and prod k3s clusters. Argo CD on each reconciles its own directory: the gateway, sign-in, Postgres, Valkey, monitoring, and the pinned chart and image of every app. A merge is the deploy, and no CI job holds a kubeconfig. Terraform and the k3s bootstrap live in maxhq.',
    href: 'https://github.com/maxmorhardt/gitops',
    links: [
      {
        label: 'Terraform & bootstrap',
        href: 'https://github.com/maxmorhardt/maxhq/tree/main/infra',
        icon: <GitHubIcon />,
      },
    ],
    tags: ['Argo CD', 'Kubernetes', 'Sealed Secrets', 'CloudNativePG', 'Dex', 'Terraform'],
  },
  {
    name: 'workflows',
    category: 'CI/CD',
    description:
      'Reusable GitHub Actions that build, test, scan, and release every repo: Go, Node, Docker images, Helm charts, Terraform, and release-please. Deploy jobs commit the new image or chart version to gitops: dev on every merge, prod on each release after approval.',
    href: 'https://github.com/maxmorhardt/workflows',
    tags: ['GitHub Actions', 'Docker', 'Helm', 'Trivy', 'release-please', 'Renovate'],
  },
];

const groups = [
  { title: 'Apps', blurb: 'What people use', start: 0, count: 3 },
  { title: 'Platform', blurb: 'What builds and runs them', start: 3, count: 3 },
];

export default function ProjectsPage() {
  return (
    <Box>
      <PageMeta
        title="Projects – Max Morhardt"
        description="Explore Max Morhardt's projects: a real-time NFL squares app and its Go services, this site, Helm charts for every app, the GitOps state of two self-hosted Kubernetes clusters, and reusable GitHub Actions workflows."
        canonical="https://maxhq.io/projects"
      />

      <PageHeader
        title="Projects"
        lede="A connected ecosystem of frontends, APIs, and infrastructure I design, build, and self-host. The apps are the surface. Underneath, every project deploys to the same Kubernetes platform that runs this site, sharing sign-on, real-time messaging, and delivery pipelines."
      />

      <Container maxWidth="lg" sx={{ pb: pageSection.py }}>
        {groups.map((group) => (
          <Box
            key={group.title}
            component="section"
            aria-labelledby={`group-${group.title}`}
            sx={{ mb: { xs: 7, md: 10 }, '&:last-of-type': { mb: { xs: 4, md: 5 } } }}
          >
            <RevealSection
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                mb: 1,
              }}
            >
              <Typography id={`group-${group.title}`} variant="h3" component="h2">
                {group.title}
              </Typography>
              <Typography sx={{ fontSize: '0.88rem' }}>{group.blurb}</Typography>
            </RevealSection>
            <Box component="ol" start={group.start + 1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
              {projects.slice(group.start, group.start + group.count).map((project, i) => (
                <ProjectRow key={project.name} project={project} index={group.start + i} />
              ))}
            </Box>
          </Box>
        ))}

        <RevealSection
          sx={{
            pt: 4,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Typography>
            Every repository here is public, from the apps down to the pipelines.
          </Typography>
          <MuiLink
            href="https://github.com/maxmorhardt"
            target="_blank"
            rel="noreferrer"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, fontWeight: 600 }}
          >
            <GitHubIcon fontSize="small" />
            Browse them on GitHub
          </MuiLink>
        </RevealSection>
      </Container>
    </Box>
  );
}
