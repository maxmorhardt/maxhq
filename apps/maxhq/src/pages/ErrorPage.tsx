import { Box, Button, Container, Typography } from '@mui/material';
import { Link } from 'react-router';
import PageMeta from '../components/common/PageMeta';
import RevealSection from '../components/common/RevealSection';
import StatusTerminal from '../components/common/StatusTerminal';
import { pageSection } from '../theme';

export interface ErrorPageProps {
  message?: string;
}

export default function ErrorPage({
  message = 'Something broke while loading this page. Reloading usually clears it, and if it keeps happening I would like to hear about it.',
}: ErrorPageProps) {
  // only runs from the click handler, so it never touches window during prerender
  const reload = () => window.location.reload();

  return (
    <Box
      component="section"
      sx={{ ...pageSection, display: 'flex', minHeight: '60svh', alignItems: 'center' }}
    >
      <PageMeta
        title="Something went wrong – Max Morhardt"
        description="An unexpected error stopped this page from loading."
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
              Something went wrong
            </Typography>
          </RevealSection>

          <RevealSection delay={1}>
            <Typography color="text.secondary" sx={{ mb: 4, maxWidth: '48ch' }}>
              {message}
            </Typography>
          </RevealSection>

          <RevealSection delay={1} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button onClick={reload} variant="outlined" color="inherit">
              Reload
            </Button>
            <Button component={Link} to="/" variant="outlined" color="inherit">
              Home
            </Button>
            <Button component={Link} to="/contact" variant="outlined" color="inherit">
              Contact
            </Button>
          </RevealSection>
        </Box>

        <RevealSection delay={2} variant="rise">
          <StatusTerminal
            title="Error"
            lines={[
              { text: 'render page', kind: 'cmd' },
              { text: 'error: the page threw while loading', kind: 'err' },
              { text: 'hint: reload, or head back home', kind: 'out' },
            ]}
          />
        </RevealSection>
      </Container>
    </Box>
  );
}
