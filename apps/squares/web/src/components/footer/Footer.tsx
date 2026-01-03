import { Box, Container, Link, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function Footer() {
  const navigate = useNavigate();
  // get current year for copyright
  const currentYear = new Date().getFullYear();

  return (
    // footer container with top border
    <Box
      component="footer"
      sx={{
        py: { xs: 2, sm: 4 },
        px: { xs: 1, sm: 2 },
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
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
              }}
            >
              © {currentYear} Squares
            </Typography>
          </Box>

          {/* footer navigation links */}
          <Stack direction="row" spacing={{ xs: 2, sm: 3 }}>
            <Link
              onClick={() => navigate('/learn-more')}
              sx={{
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                textDecoration: 'none',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                '&:hover': {
                  color: 'white',
                },
              }}
            >
              Learn More
            </Link>
            <Link
              onClick={() => navigate('/contact')}
              sx={{
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                textDecoration: 'none',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                '&:hover': {
                  color: 'white',
                },
              }}
            >
              Contact
            </Link>
            <Link
              onClick={() => navigate('/privacy-policy')}
              sx={{
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                textDecoration: 'none',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                '&:hover': {
                  color: 'white',
                },
              }}
            >
              Privacy
            </Link>
            <Link
              onClick={() => navigate('/terms-of-service')}
              sx={{
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                textDecoration: 'none',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                '&:hover': {
                  color: 'white',
                },
              }}
            >
              Terms
            </Link>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
