import GitHubIcon from '@mui/icons-material/GitHub';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Container, Divider, Link as MuiLink, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import PageHeader from '../components/common/PageHeader';
import PageMeta from '../components/common/PageMeta';
import SectionNav from '../components/common/SectionNav';
import RevealSection from '../components/common/RevealSection';
import { fonts, pageSection } from '../theme';

interface Role {
  title: string;
  period: string;
  points: string[];
}

const experience: { company: string; roles: Role[] }[] = [
  {
    company: 'Fidelity Investments',
    roles: [
      {
        title: 'Software Engineer',
        period: 'Apr 2024 - Present',
        points: [
          'Engineer on a platform team provisioning cloud-based IDEs on AWS (VSCode, JupyterLab, RStudio, Airflow) for over 3,000 users spanning quantitative development, machine learning, and prototyping.',
          'Drove the migration from EC2 to EKS with async Spring Boot endpoints and Kubernetes Java Client integrations orchestrating pod lifecycle, cutting IDE spin-up time from 15 minutes to 2 and infrastructure costs by 20%.',
          'Integrating a new firm-wide AI gateway built on Go and Envoy AI Gateway with an existing org-specific gateway, covering multi-provider LLM routing, token-based rate limiting, and per-tenant quota enforcement.',
          'One of the primary escalation points for platform reliability, on-call in and out of rotation, debugging incidents across EKS, EC2, shared filesystems (S3, EFS, NetApp), Jenkins pipelines, and the frontend.',
          'Owned self-service EC2 and EKS configuration profiles and bring-your-own IAM role, adopted by over 60% of users.',
          'Rewrote the Angular frontend from Bootstrap to PrimeNG across 750+ files, split oversized modules into standalone components, consolidated duplicate components and SASS into shared libraries, fixed XSS vulnerabilities, and cut the main bundle size 46%.',
        ],
      },
      {
        title: 'Associate Software Engineer',
        period: 'Jan 2023 - Apr 2024',
        points: [
          'Led development of a patent-pending full stack automated deployment tool that ingests OpenAPI specs from SwaggerHub, generates Spring Boot scaffolding, and deploys to Azure Kubernetes Service through a programmatically created Jenkins pipeline, reducing deployment time from 3 days to under 45 minutes.',
          'Mentored two engineering interns through their projects, both of whom received return offers.',
        ],
      },
    ],
  },
];

// short helper so the prose below reads close to the original markup
function C({ children }: { children: ReactNode }) {
  return <code>{children}</code>;
}

const sections = [
  { id: 'experience', label: 'Experience' },
  { id: 'project', label: 'Project' },
  { id: 'platform', label: 'Platform' },
  { id: 'this-site', label: 'This site' },
  { id: 'education', label: 'Education' },
];

// one labelled section the on-this-page nav can jump to
function Row({ id, children }: { id: string; children: ReactNode }) {
  const label = sections.find((section) => section.id === id)?.label ?? id;

  return (
    <Box component="section" id={id} aria-labelledby={`${id}-label`}>
      <Divider />
      <RevealSection delay={1} sx={{ py: { xs: 4, md: 5.5 } }}>
        <Typography id={`${id}-label`} variant="overline" component="h2" sx={{ mb: 2.5 }}>
          {label}
        </Typography>
        <Box sx={{ minWidth: 0 }}>{children}</Box>
      </RevealSection>
    </Box>
  );
}

function RoleHead({ title, meta }: { title: string; meta: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 1,
        mb: 1,
      }}
    >
      <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>{title}</Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontFamily: fonts.mono, whiteSpace: 'nowrap' }}
      >
        {meta}
      </Typography>
    </Box>
  );
}

export default function AboutPage() {
  return (
    <Box>
      <PageMeta
        title="About – Max Morhardt"
        description="About Max Morhardt, Software Engineer at Fidelity Investments building multi-tenant cloud platforms on AWS and EKS, alongside a self-hosted Kubernetes homelab."
        canonical="https://maxhq.io/about"
      />

      <PageHeader
        title="About"
        lede="Software Engineer at Fidelity Investments, working across platform and cloud infrastructure, from API design and Kubernetes orchestration to the front-end interfaces on top."
      />

      <Container
        maxWidth="lg"
        sx={{
          pb: pageSection.py,
          display: 'grid',
          gridTemplateColumns: { md: '190px minmax(0, 1fr)' },
          gap: { md: 8 },
          alignItems: 'start',
        }}
      >
        <SectionNav items={sections} title="On this page" />

        <Box sx={{ minWidth: 0, maxWidth: 780 }}>
          <Row id="experience">
            {experience.map((company, ci) => (
              <Box key={company.company} sx={{ mt: ci > 0 ? 3 : 0 }}>
                <Typography variant="h3" component="h2" sx={{ mb: 2, fontSize: '1.15rem' }}>
                  {company.company}
                </Typography>

                {company.roles.map((role, ri) => (
                  <Box
                    key={role.title}
                    sx={{
                      position: 'relative',
                      pl: 3.5,
                      pb: ri < company.roles.length - 1 ? 4 : 0,
                      // the timeline: a rule between roles and a node at each one
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: 5,
                        top: 18,
                        bottom: ri < company.roles.length - 1 ? -2 : 'auto',
                        width: 2,
                        bgcolor: 'divider',
                      },
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 6,
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        border: 2,
                        borderColor: 'primary.main',
                        bgcolor: ri === 0 ? 'primary.main' : 'background.default',
                      },
                    }}
                  >
                    <RoleHead title={role.title} meta={role.period} />

                    <Box
                      component="ul"
                      sx={{
                        m: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        pl: 2.5,
                        color: 'text.secondary',
                      }}
                    >
                      {role.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            ))}
          </Row>

          <Row id="project">
            <RoleHead title="Squares" meta="Go · React · Kubernetes" />

            <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
              A full-stack real-time football squares platform: four <C>Go</C> and <C>Gin</C>{' '}
              microservices behind a <C>React</C> and <C>TypeScript</C> front end, deployed to my
              self-hosted Kubernetes clusters through GitHub Actions and <C>Argo CD</C>. It
              implements a contest state machine, automated winner calculation, a transactional
              outbox feeding <C>Redis</C> streams, resumable server-sent events for live updates,
              Google and GitHub sign-in validated at the gateway through <C>Dex</C>, and{' '}
              <C>PostgreSQL</C> persistence with <C>GORM</C>. One build of every service runs in
              both the dev and production clusters, configured per environment.
            </Typography>

            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <MuiLink
                href="https://squares.maxhq.io"
                target="_blank"
                rel="noreferrer"
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
              >
                <OpenInNewIcon fontSize="small" />
                Live site
              </MuiLink>

              <MuiLink
                href="https://github.com/maxmorhardt/maxhq/tree/main/apps/squares"
                target="_blank"
                rel="noreferrer"
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
              >
                <GitHubIcon fontSize="small" />
                GitHub
              </MuiLink>
            </Box>
          </Row>

          <Row id="platform">
            <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
              Everything I build runs on two <C>k3s</C> clusters I provision myself: dev on
              Raspberry Pis at home and production on three cloud VPSes, each with a highly
              available control plane on embedded <C>etcd</C>. A <C>Python</C> bootstrap tool
              converges every node from a single inventory, and all node-to-node traffic runs over{' '}
              <C>Tailscale</C>. <C>Envoy Gateway</C> routes every app through one front door,{' '}
              <C>Dex</C> federates Google and GitHub sign-in, <C>CloudNativePG</C> runs replicated{' '}
              <C>PostgreSQL</C> with continuous backups to S3, and <C>Valkey</C> with Sentinel
              handles caching and event streams. <C>Argo CD</C> keeps both clusters in sync with
              Git, so reusable Helm charts and GitHub Actions workflows release every app the same
              way. <C>Sealed Secrets</C> lets secrets live safely in the repo, <C>Renovate</C> keeps
              dependencies current, and <C>system-upgrade-controller</C> and <C>kured</C> handle k3s
              upgrades and coordinated rolling node reboots. The infrastructure around it is code
              too: <C>Terraform</C> runs through GitHub Actions to manage S3 remote state,{' '}
              <C>Cloudflare</C> DNS and edge security, and GitHub repo settings.
            </Typography>
          </Row>

          <Row id="this-site">
            <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
              A <C>React 19</C> app prerendered to static HTML with <C>React Router</C> framework
              mode, so every route ships real markup and then hydrates. Styled with{' '}
              <C>Material UI</C> and <C>Emotion</C> on a themed token set with persistent light and
              dark modes. Containerized with <C>Docker</C> behind <C>NGINX</C>, packaged into a{' '}
              <C>Helm</C> chart, and deployed to my Kubernetes clusters through the same reusable{' '}
              <C>GitHub Actions</C> and <C>Argo CD</C> pipeline that ships every other project here.
            </Typography>
          </Row>

          <Row id="education">
            <RoleHead title="Elon University" meta="2018 - 2022" />
            <Typography color="text.secondary">
              B.S. Computer Science, Data Science Minor · Elon, NC
            </Typography>
          </Row>
        </Box>
      </Container>
    </Box>
  );
}
