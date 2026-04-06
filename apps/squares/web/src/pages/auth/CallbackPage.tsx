import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { keyframes, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';

const gridReveal = keyframes`
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(144, 202, 249, 0.3); }
  50% { box-shadow: 0 0 20px rgba(144, 202, 249, 0.6); }
`;

const fadeInUp = keyframes`
  0% { opacity: 0; transform: translateY(12px); }
  100% { opacity: 1; transform: translateY(0); }
`;

const GRID_SIZE = 4;
const CELL_SIZE = 18;
const GAP = 4;

export default function CallbackPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code && !state) {
      showToast('Invalid authentication state', 'error');
      navigate('/', { replace: true });
    }
  }, [searchParams, navigate, showToast]);

  useEffect(() => {
    if (auth.isLoading) {
      return;
    }

    try {
      if (auth.isAuthenticated) {
        const redirectPath = sessionStorage.getItem('auth_redirect_path') || '/contests';
        sessionStorage.removeItem('auth_redirect_path');
        navigate(redirectPath, { replace: true });
        return;
      }

      if (auth.error) {
        console.error('Auth error after loading and is authenticated checks', auth.error);
        showToast('Authentication failed. Please try again', 'error');
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('Error during post authentication redirect:', error);
      showToast('Authentication failed. Please try again', 'error');
      navigate('/', { replace: true });
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.error, navigate, auth, showToast]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: { xs: 2, sm: 3 },
        p: { xs: 2, sm: 4 },
        my: '4rem',
      }}
    >
      {/* Animated squares grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
          gap: `${GAP}px`,
        }}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
          <Box
            key={i}
            sx={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              borderRadius: '4px',
              backgroundColor: theme.palette.primary.main,
              animation: prefersReducedMotion
                ? 'none'
                : `${gridReveal} 0.5s ease-out ${i * 0.06}s both, ${pulseGlow} 2s ease-in-out ${i * 0.12}s infinite`,
            }}
          />
        ))}
      </Box>

      {/* Shimmer text */}
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          background: `linear-gradient(90deg, ${theme.palette.text.secondary} 0%, ${theme.palette.primary.light} 50%, ${theme.palette.text.secondary} 100%)`,
          backgroundSize: '200% auto',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: prefersReducedMotion ? 'none' : `${shimmer} 2s linear infinite`,
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
        }}
      >
        Signing you in
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: 'text.disabled',
          animation: prefersReducedMotion ? 'none' : `${fadeInUp} 0.6s ease-out 0.8s both`,
          fontSize: { xs: '0.75rem', sm: '0.875rem' },
        }}
      >
        This will only take a moment
      </Typography>
    </Box>
  );
}
