import EmailIcon from '@mui/icons-material/Email';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import { Box, Container } from '@mui/material';
import PageHeader from '../components/common/PageHeader';
import PageMeta from '../components/common/PageMeta';
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
    href: 'https://www.linkedin.com/in/maxmorhardt',
    icon: <LinkedInIcon />,
    handle: 'Max Morhardt',
  },
  {
    label: 'Email',
    href: 'mailto:max@maxhq.io',
    icon: <EmailIcon />,
    handle: 'max@maxhq.io',
  },
];

export default function ContactPage() {
  return (
    <Box>
      <PageMeta
        title="Contact – Max Morhardt"
        description="Get in touch with Max Morhardt via GitHub, LinkedIn, or email."
        canonical="https://maxhq.io/contact"
      />

      <PageHeader
        title="Contact"
        lede="The best ways to reach me. I read every message and usually reply within a day or two."
      />

      <Container maxWidth="lg" sx={{ pb: pageSection.py }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 2.5,
          }}
        >
          {channels.map((c, i) => (
            <ContactCard key={c.label} channel={c} delay={(i + 1) as 1 | 2 | 3} />
          ))}
        </Box>
      </Container>
    </Box>
  );
}
