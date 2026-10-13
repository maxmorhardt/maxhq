import EmailIcon from '@mui/icons-material/Email';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import { Box, Container, Typography } from '@mui/material';
import PageMeta from '../components/common/PageMeta';
import RevealSection from '../components/common/RevealSection';
import ContactCard, { type ContactChannel } from '../components/contact/ContactCard';
import { pageSection } from '../theme';

const channels: ContactChannel[] = [
  {
    label: 'GitHub',
    href: 'https://github.com/maxmorhardt',
    icon: <GitHubIcon />,
    handle: '@maxmorhardt',
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/max-morhardt-60b9121b8/',
    icon: <LinkedInIcon />,
    handle: 'Max Morhardt',
  },
  {
    label: 'Email',
    href: 'mailto:max@maxstash.io',
    icon: <EmailIcon />,
    handle: 'max@maxstash.io',
  },
];

export default function ContactPage() {
  return (
    <Box component="section" sx={pageSection}>
      <PageMeta
        title="Contact – Max Morhardt"
        description="Get in touch with Max Morhardt via GitHub, LinkedIn, or email."
        canonical="https://maxstash.io/contact"
      />

      <Container maxWidth="lg">
        <RevealSection variant="left">
          <Typography variant="h4" component="h1" gutterBottom>
            Contact
          </Typography>
        </RevealSection>

        <RevealSection delay={1} variant="left">
          <Typography color="text.secondary" sx={{ mb: 6, maxWidth: '60ch' }}>
            The best ways to reach me. I read every message and usually reply within a day or two.
          </Typography>
        </RevealSection>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2 }}>
          {channels.map((c, i) => (
            <ContactCard key={c.label} channel={c} delay={(i + 1) as 1 | 2 | 3} />
          ))}
        </Box>
      </Container>
    </Box>
  );
}
