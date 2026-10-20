import { Box, Button, Container, Typography } from '@mui/material';
import { Link, useLocation } from 'react-router';
import PageMeta from '../components/common/PageMeta';
import RevealSection from '../components/common/RevealSection';
import StatusTerminal from '../components/common/StatusTerminal';
import { pageSection } from '../theme';

const links = [
  { label: 'Home', to: '/' },
  { label: 'Projects', to: '/projects' },
  { label: 'Apps', to: '/apps' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

export default function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <Box
      component="section"
      sx={{ ...pageSection, display: 'flex', minHeight: '60svh', alignItems: 'center' }}
    >
      <PageMeta
        title="Page not found – Max Morhardt"
        description="The page you were looking for does not exist."
        robots="noindex, follow"
      />

      <Container
        maxWidth="lg"
        sx={{
          display: 'grid',
          gridTemplateColumns: { md: 'minmax(0, 1fr) minmax(0, 1fr)' },
          gap: { xs: 6, md: 10 },
          alignItems: 'center',
        }}
      >
        <Box>
          <RevealSection delay={1}>
            <Typography variant="h4" component="h1" gutterBottom>
              This page doesn&apos;t exist
            </Typography>
          </RevealSection>

          <RevealSection delay={1}>
            <Typography color="text.secondary" sx={{ mb: 4, maxWidth: '48ch' }}>
              The link may be broken or the page may have moved. Try one of these instead.
            </Typography>
          </RevealSection>

          <RevealSection delay={1} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {links.map((link) => (
              <Button
                key={link.to}
                component={Link}
                to={link.to}
                variant="outlined"
                color="inherit"
              >
                {link.label}
              </Button>
            ))}
          </RevealSection>
        </Box>

        <RevealSection delay={2} variant="rise">
          <StatusTerminal
            title="404 · Not found"
            lines={[
              { text: `cd ${pathname}`, kind: 'cmd' },
              { text: `cd: no such file or directory: ${pathname}`, kind: 'err' },
              { text: 'ls ~', kind: 'cmd' },
              { text: 'projects/  apps/  about/  contact/', kind: 'out' },
            ]}
          />
        </RevealSection>
      </Container>
    </Box>
  );
}
