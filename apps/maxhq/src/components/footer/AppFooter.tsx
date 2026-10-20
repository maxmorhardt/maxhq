import EmailIcon from '@mui/icons-material/Email';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import { Box, Container, IconButton, Link as MuiLink, Typography } from '@mui/material';
import type { ReactElement } from 'react';
import { Link } from 'react-router';

interface SocialLink {
  label: string;
  href: string;
  icon: ReactElement;
}

const socials: SocialLink[] = [
  {
    label: 'GitHub',
    href: 'https://github.com/maxmorhardt',
    icon: <GitHubIcon fontSize="small" />,
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/max-morhardt-60b9121b8/',
    icon: <LinkedInIcon fontSize="small" />,
  },
  { label: 'Email', href: 'mailto:max@maxhq.io', icon: <EmailIcon fontSize="small" /> },
];

const links = [
  { label: 'Terms', to: '/terms-of-service' },
  { label: 'Privacy', to: '/privacy-policy' },
];

export default function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider' }}>
      <Container
        maxWidth="xl"
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          py: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box component="img" src="/logo.svg" alt="" width={22} height={22} />
          <Typography variant="body2">© {year} Max Morhardt</Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
          <Box component="nav" aria-label="Legal" sx={{ display: 'flex', gap: 2, mr: 1 }}>
            {links.map((link) => (
              <MuiLink
                key={link.to}
                component={Link}
                to={link.to}
                underline="hover"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.88rem',
                  '&:hover': { color: 'text.primary' },
                }}
              >
                {link.label}
              </MuiLink>
            ))}
          </Box>

          {socials.map((link) => (
            <IconButton
              key={link.href}
              component="a"
              href={link.href}
              target="_blank"
              rel="noreferrer"
              aria-label={link.label}
              size="small"
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              {link.icon}
            </IconButton>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
