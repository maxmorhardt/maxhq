import { Box, CircularProgress, Container, Typography } from '@mui/material';

interface RedirectingToLoginProps {
  subtitle?: string;
}

export default function RedirectingToLogin({
  subtitle = 'You will be redirected shortly',
}: RedirectingToLoginProps) {
  return (
    <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <CircularProgress size={40} />
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
          Redirecting to sign in...
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          {subtitle}
        </Typography>
      </Box>
    </Container>
  );
}
