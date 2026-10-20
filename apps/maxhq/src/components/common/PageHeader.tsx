import { Box, Container, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import RevealSection from './RevealSection';

export interface PageHeaderProps {
  title: string;
  lede: ReactNode;
  width?: 'md' | 'lg';
}

export default function PageHeader({ title, lede, width = 'lg' }: PageHeaderProps) {
  return (
    <Box
      component="header"
      sx={{ position: 'relative', overflow: 'hidden', pt: { xs: 8, md: 12 }, pb: { xs: 5, md: 8 } }}
    >
      <Box
        aria-hidden
        sx={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: 0,
          background: (theme) => {
            const { palette } = theme.vars ?? theme;

            return `radial-gradient(48% 80% at 18% -10%, ${palette.heroGlow1}, transparent 70%), radial-gradient(30% 60% at 70% -20%, ${palette.heroGlow2}, transparent 70%)`;
          },
          opacity: 0.7,
        }}
      />

      <Container maxWidth={width} sx={{ position: 'relative' }}>
        <RevealSection>
          <Typography variant="h4" component="h1">
            {title}
          </Typography>
        </RevealSection>

        <RevealSection delay={1}>
          <Typography sx={{ mt: 2.5, maxWidth: '60ch', fontSize: { md: '1.15rem' } }}>
            {lede}
          </Typography>
        </RevealSection>
      </Container>
    </Box>
  );
}
