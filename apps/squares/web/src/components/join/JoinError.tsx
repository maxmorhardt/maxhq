import { ErrorOutline } from '@mui/icons-material';
import { Box, Button, Container, Paper, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface JoinErrorProps {
  message: string;
}

export default function JoinError({ message }: JoinErrorProps) {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 8 }, px: { xs: 2, sm: 3 } }}>
      <Paper
        sx={{
          background: theme.palette.grey[900],
          border: `1px solid ${theme.palette.grey[800]}`,
          borderRadius: 3,
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(255,100,100,0.12)',
            border: '1px solid rgba(255,100,100,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <ErrorOutline sx={{ fontSize: 28, color: '#ff6b6b' }} />
        </Box>

        <Typography sx={{ fontWeight: 700, fontSize: '1.3rem', color: 'white', mb: 1.5 }}>
          Unable to Join
        </Typography>

        <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', mb: 3 }}>
          {message}
        </Typography>

        <Button
          variant="outlined"
          onClick={() => navigate('/contests')}
          sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.2)' }}
        >
          My Contests
        </Button>
      </Paper>
    </Container>
  );
}
