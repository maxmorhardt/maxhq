import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import { keyframes, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

export default function CallbackPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    if (auth.isAuthenticated) {
      const redirectPath = sessionStorage.getItem('auth_redirect_path') || '/contests';
      sessionStorage.removeItem('auth_redirect_path');
      navigate(redirectPath, { replace: true });
    } else if (auth.error) {
      console.error('Authentication error:', auth.error);
      navigate('/', { replace: true });
    }
  }, [auth.isAuthenticated, auth.error, navigate]);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mt: '8rem',
      }}
    >
      <Card
        sx={{
          maxWidth: 500,
          width: '90%',
          backgroundColor: theme.palette.grey[900],
          borderRadius: 4,
        }}
      >
        <CardContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            py: 6,
            px: 4,
          }}
        >
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress
              size={80}
              thickness={2}
              sx={{
                color: 'primary.main',
                animation: `${spin} 1.5s linear infinite`,
              }}
            />
            <CircularProgress
              size={60}
              thickness={3}
              variant="determinate"
              value={75}
              sx={{
                position: 'absolute',
                color: 'secondary.main',
                animation: `${spin} 2s linear infinite reverse`,
              }}
            />
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 600,
                mb: 1,
                background: '#FFF',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Almost there!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 0.5 }}>
              Completing your authentication
            </Typography>
            <Typography variant="body2" color="text.disabled">
              This will only take a moment
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
