import { Box, Button, Container, Typography } from '@mui/material';
import { Link } from 'react-router';
import PageMeta from '../components/common/PageMeta';
import RevealSection from '../components/common/RevealSection';
import { fonts, pageSection } from '../theme';

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

      <Container maxWidth="sm">
        <RevealSection variant="left">
          <Typography variant="overline" sx={{ fontFamily: fonts.mono }}>
            Error
          </Typography>
        </RevealSection>

        <RevealSection delay={1} variant="left">
          <Typography variant="h4" component="h1" gutterBottom>
            Something went wrong
          </Typography>
        </RevealSection>

        <RevealSection delay={1} variant="left">
          <Typography color="text.secondary" sx={{ mb: 4, maxWidth: '48ch' }}>
            {message}
          </Typography>
        </RevealSection>

        <RevealSection delay={1} variant="left" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={reload} color="inherit">
            Reload
          </Button>
          <Button component={Link} to="/" color="inherit">
            Home
          </Button>
          <Button component={Link} to="/contact" color="inherit">
            Contact
          </Button>
        </RevealSection>
      </Container>
    </Box>
  );
}
