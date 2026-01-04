import { Box, Container, Link, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function Footer() {
  const navigate = useNavigate();
  // get current year for copyright
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    { label: 'Learn More', path: '/learn-more' },
    { label: 'Contact', path: '/contact' },
    { label: 'Privacy', path: '/privacy-policy' },
    { label: 'Terms', path: '/terms-of-service' },
  ];

  return (
    // footer container with top border
    <Box
      component="footer"
      sx={{
        py: { xs: 2.5, sm: 4 },
        px: 2,
        mt: 'auto',
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <Container maxWidth="lg">
        {/* responsive stack layout for footer content */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 2, sm: 3 }}
          justifyContent="space-between"
          alignItems="center"
        >
          {/* logo and copyright section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
            <img src="/squares_logo.png" alt="Logo" style={{ width: 24, height: 'auto' }} />
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255,255,255,0.7)',
                fontFamily: 'monospace',
                fontWeight: 700,
                fontSize: '0.875rem',
              }}
            >
              © {currentYear} Squares
            </Typography>
          </Box>

          {/* footer navigation links */}
          <Stack direction="row" spacing={{ xs: 2, sm: 3 }}>
            {footerLinks.map((link) => (
              <Link
                key={link.path}
                onClick={() => navigate(link.path)}
                sx={{
                  color: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  '&:hover': {
                    color: 'white',
                  },
                }}
              >
                {link.label}
              </Link>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
