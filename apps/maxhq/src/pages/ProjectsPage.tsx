import GitHubIcon from '@mui/icons-material/GitHub';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Container, Typography } from '@mui/material';
import PageHeader from '../components/common/PageHeader';
import RepoMap from '../components/projects/RepoMap';
import PageMeta from '../components/common/PageMeta';
import RevealSection from '../components/common/RevealSection';
import ProjectCard, { type Project } from '../components/projects/ProjectCard';
import { pageSection } from '../theme';

// two rows of three: the apps, then the platform that builds, versions, and runs them
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
        {/* under the hood: how a change reaches the clusters */}
        <RevealSection>
          <Typography variant="h3" component="h2" sx={{ mb: 3, fontSize: '1.4rem' }}>
            Under the hood
          </Typography>
        </RevealSection>

        <RevealSection variant="rise" sx={{ mb: 5 }}>
          <RepoMap />
        </RevealSection>

        {/* the repositories */}
        <RevealSection>
          <Typography variant="h3" component="h2" sx={{ mt: 10, mb: 3, fontSize: '1.4rem' }}>
            The repositories
          </Typography>
        </RevealSection>

        <Box
          sx={{
            display: 'grid',
            // fixed columns that divide the six cards evenly at every width
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
            },
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
