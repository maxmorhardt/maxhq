import { Box, Typography } from '@mui/material';
import RevealSection from '../common/RevealSection';

interface Impact {
  figure: string;
  body: string;
}

const impacts: Impact[] = [
  {
    figure: '15 → 2 min',
    body: 'Cloud IDE spin-up time after driving the move from EC2 to EKS, for VS Code, JupyterLab, RStudio, and Airflow on AWS.',
  },
  {
    figure: '60%+',
    body: 'Of users on the self-service EC2 and EKS profiles and bring-your-own IAM roles I owned.',
  },
  {
    figure: '−46%',
    body: 'Main bundle size after rewriting the Angular frontend from Bootstrap to PrimeNG across 750+ files.',
  },
  {
    figure: '3 days → 45 min',
    body: 'Deployment time with a tool I led that turns OpenAPI specs into deployed Spring Boot services.',
  },
];

export default function ImpactList() {
  return (
    <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {impacts.map((impact, i) => (
        <RevealSection
          key={impact.figure}
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
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {impact.figure}
          </Typography>
          <Typography sx={{ maxWidth: '52ch', fontSize: { md: '1.08rem' } }}>
            {impact.body}
          </Typography>
        </RevealSection>
      ))}
    </Box>
  );
}
