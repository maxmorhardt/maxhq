import { Box, CircularProgress, Container, Typography } from '@mui/material';

interface LoadingScreenProps {
  title: string;
  subtitle: string;
}

export default function LoadingScreen({ title, subtitle }: LoadingScreenProps) {
  return (
    <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <CircularProgress size={40} />
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          {subtitle}
        </Typography>
      </Box>
    </Container>
  );
}
