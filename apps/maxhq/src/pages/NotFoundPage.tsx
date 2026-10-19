import { Box, Button, Container, Typography } from '@mui/material';
import { Link } from 'react-router';
import PageMeta from '../components/common/PageMeta';
import RevealSection from '../components/common/RevealSection';
import { fonts, pageSection } from '../theme';

const links = [
  { label: 'Home', to: '/' },
  { label: 'Projects', to: '/projects' },
  { label: 'Apps', to: '/apps' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

export default function NotFoundPage() {
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

      <Container maxWidth="sm">
        <RevealSection variant="left">
          <Typography variant="overline" sx={{ fontFamily: fonts.mono }}>
            404 · Not found
          </Typography>
        </RevealSection>

        <RevealSection delay={1} variant="left">
          <Typography variant="h4" component="h1" gutterBottom>
            This page doesn&apos;t exist
          </Typography>
        </RevealSection>

        <RevealSection delay={1} variant="left">
          <Typography color="text.secondary" sx={{ mb: 4, maxWidth: '48ch' }}>
            The link may be broken or the page may have moved. Try one of these instead.
          </Typography>
        </RevealSection>

        <RevealSection delay={1} variant="left" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {links.map((link) => (
            <Button key={link.to} component={Link} to={link.to} color="inherit">
              {link.label}
            </Button>
          ))}
        </RevealSection>
      </Container>
    </Box>
  );
}
