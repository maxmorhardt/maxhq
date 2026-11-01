import { Box, Typography } from '@mui/material';
import RevealSection from '../common/RevealSection';

interface Area {
  title: string;
  body: string;
}

const areas: Area[] = [
  {
    title: 'APIs',
    body: 'Designing and building services in Java with Spring Boot and in Go, with clear contracts and OpenAPI specs other teams can build against.',
  },
  {
    title: 'Architecture',
    body: 'Shaping how services, data, and platforms fit together, and planning migrations that move a system forward without breaking the people on it.',
  },
  {
    title: 'Interfaces',
    body: 'Building the Angular and React frontends people use every day, with shared component libraries and fast, accessible pages.',
  },
  {
    title: 'Infrastructure',
    body: 'Running workloads on AWS and Kubernetes, with Terraform, IAM, and CI/CD pipelines that ship on merge.',
  },
  {
    title: 'Observability',
    body: 'Metrics, logs, traces, and alerts that point at the real problem, and on-call debugging across the whole stack when something breaks.',
  },
];

export default function ImpactList() {
  return (
    <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {areas.map((area, i) => (
        <RevealSection
          key={area.title}
          component="li"
          delay={Math.min(i, 3) as 0 | 1 | 2 | 3}
          sx={{
            display: 'grid',
            gap: 1.25,
            py: { xs: 3, md: 3.5 },
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Typography
            sx={{
              color: 'text.primary',
              fontSize: 'clamp(2rem, 4.4vw, 3.4rem)',
              fontWeight: 680,
              letterSpacing: '-0.035em',
              lineHeight: 1.05,
            }}
          >
            {area.title}
          </Typography>
          <Typography sx={{ maxWidth: '52ch', fontSize: { md: '1.08rem' } }}>
            {area.body}
          </Typography>
        </RevealSection>
      ))}
    </Box>
  );
}
