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

const columns: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: 'Site',
    links: [
      { label: 'Projects', to: '/projects' },
      { label: 'Apps', to: '/apps' },
      { label: 'About', to: '/about' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', to: '/terms-of-service' },
      { label: 'Privacy Policy', to: '/privacy-policy' },
    ],
  },
];

const linkSx = {
  color: 'text.secondary',
  fontSize: '0.92rem',
  '&:hover': { color: 'text.primary' },
} as const;

export default function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider' }}>
      <Container maxWidth="xl" sx={{ pt: { xs: 6, md: 8 }, pb: 4 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: '2fr 1fr 1fr' },
            gap: { xs: 5, md: 6 },
          }}
        >
          <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.25,
                color: 'text.primary',
                fontWeight: 680,
                fontSize: '1.08rem',
                letterSpacing: '-0.02em',
              }}
            >
              <Box component="img" src="/logo.svg" alt="" width={28} height={28} />
              maxhq
            </Box>
            <Typography variant="body2" sx={{ mt: 1.5, maxWidth: '36ch' }}>
              Apps and infrastructure by Max Morhardt, self-hosted on Kubernetes from the first
              commit to production.
            </Typography>

            <Box sx={{ mt: 2.5, display: 'flex', gap: 0.5, ml: -1 }}>
              {socials.map((link) => (
                <IconButton
                  key={link.href}
                  component="a"
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={link.label}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
                >
                  {link.icon}
                </IconButton>
              ))}
            </Box>
          </Box>

          {columns.map((column) => (
            <Box key={column.title} component="nav" aria-label={column.title}>
              <Typography
                component="h2"
                sx={{ color: 'text.primary', fontWeight: 620, fontSize: '0.92rem', mb: 1.5 }}
              >
                {column.title}
              </Typography>
              <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1 }}>
                {column.links.map((link) => (
                  <li key={link.to}>
                    <MuiLink component={Link} to={link.to} underline="hover" sx={linkSx}>
                      {link.label}
                    </MuiLink>
                  </li>
                ))}
              </Box>
            </Box>
          ))}
        </Box>

        <Typography
          variant="body2"
          sx={{ mt: { xs: 6, md: 8 }, pt: 3, borderTop: 1, borderColor: 'divider' }}
        >
          © {year} Max Morhardt
        </Typography>
      </Container>
    </Box>
  );
}
