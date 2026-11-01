import { Box, Container, Divider, Typography } from '@mui/material';
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
          'Build full-stack features across Spring Boot APIs, an Angular frontend, and AWS infrastructure for cloud development environments (VS Code, JupyterLab, RStudio, Airflow).',
          'Designed async Spring Boot APIs and Kubernetes integrations that manage workloads end to end, and led the backend move from EC2 to EKS, making environments start far faster.',
          'Building Go services for LLM routing, token-based rate limiting, and per-tenant quotas.',
          'Rewrote the Angular frontend onto PrimeNG, split it into standalone components and shared libraries, fixed XSS vulnerabilities, and made the app much lighter to load.',
          'Own self-service AWS configuration for EC2, EKS, and bring-your-own IAM roles.',
          'A primary escalation point on call, debugging incidents across the APIs, the frontend, Kubernetes, storage, and CI/CD pipelines.',
        ],
      },
      {
        title: 'Associate Software Engineer',
        period: 'Jan 2023 - Apr 2024',
        points: [
          'Led a full-stack tool that turns OpenAPI specs into Spring Boot services and deploys them to Azure Kubernetes Service through generated Jenkins pipelines, taking deployments from days to minutes.',
        ],
      },
    ],
  },
];

const sections = [
  { id: 'experience', label: 'Experience' },
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
        description="About Max Morhardt, a Software Engineer at Fidelity Investments building APIs, user interfaces, and cloud infrastructure, who also self-hosts the apps on this site on Kubernetes."
        canonical="https://maxhq.io/about"
      />

      <PageHeader
        title="About"
        lede="Software Engineer at Fidelity Investments, working across the whole stack: designing APIs and services, building the interfaces on top, and running the cloud infrastructure underneath."
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
