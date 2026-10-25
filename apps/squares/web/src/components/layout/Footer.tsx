import { Box, Container, Link, Typography } from '@mui/material';
import { useNavigate } from 'react-router';
import { fonts } from '../../app/theme';

export default function Footer() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  // legal pages are centralized on maxhq.io for all services
  const footerLinks = [
    { label: 'Learn More', path: '/learn-more' },
    { label: 'Contact', path: '/contact' },
    { label: 'Privacy', href: 'https://maxhq.io/privacy-policy' },
    { label: 'Terms', href: 'https://maxhq.io/terms-of-service' },
  ];

  return (
    <Box component="footer" sx={{ mt: 'auto', borderTop: 1, borderColor: 'divider' }}>
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: { xs: 2, sm: 3 },
            py: { xs: 3, sm: 4 },
          }}
        >
          {/* logo and copyright */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box component="img" src="/logo.svg" alt="" sx={{ width: 22, height: 22 }} />
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontFamily: fonts.display,
                fontWeight: 700,
                fontSize: '0.95rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              © {currentYear} Squares
            </Typography>
          </Box>

          {/* footer navigation links */}
          <Box component="nav" sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 2, sm: 3 } }}>
            {footerLinks.map((link) => (
              <Link
                key={link.label}
                {...(link.href
                  ? { href: link.href, target: '_blank', rel: 'noreferrer' }
                  : { onClick: () => link.path && navigate(link.path) })}
                underline="hover"
                sx={{
                  color: 'text.secondary',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  '&:hover': { color: 'text.primary' },
                }}
              >
                {link.label}
              </Link>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
