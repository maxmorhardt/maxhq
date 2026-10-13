import EmailIcon from '@mui/icons-material/Email';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import { Box, Chip, Container, Divider, Typography } from '@mui/material';
import type { ReactElement } from 'react';

interface FooterLink {
  label: string;
  href: string;
  icon: ReactElement;
}

const links: FooterLink[] = [
  { label: 'GitHub', href: 'https://github.com/maxmorhardt', icon: <GitHubIcon /> },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/max-morhardt-60b9121b8/',
    icon: <LinkedInIcon />,
  },
  { label: 'Email', href: 'mailto:max@maxstash.io', icon: <EmailIcon /> },
];

export default function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <Box component="footer" sx={{ bgcolor: 'background.paper' }}>
      <Divider />

      <Container maxWidth="xl" sx={{ py: 2 }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {year} Max Morhardt
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {links.map((link) => (
              <Chip
                key={link.href}
                component="a"
                href={link.href}
                target="_blank"
                rel="noreferrer"
                aria-label={link.label}
                clickable
                variant="outlined"
                icon={link.icon}
                label={link.label}
              />
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
