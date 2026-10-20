import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { keyframes, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

const gridReveal = keyframes`
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;

const gridExit = keyframes`
  0% { transform: scale(1); opacity: 1; }
  25% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0); opacity: 0; }
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

const fadeOut = keyframes`
  0% { opacity: 1; }
  100% { opacity: 0; }
`;

const GRID_SIZE = 4;
const CELL_SIZE = 18;
const GAP = 4;

interface AuthLoadingAnimationProps {
  title?: string;
  subtitle?: string;
  exiting?: boolean;
}

export default function AuthLoadingAnimation({
  title = 'Signing you in',
  subtitle = 'This will only take a moment',
  exiting = false,
}: AuthLoadingAnimationProps) {
  const theme = useTheme();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

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
      {/* animated squares grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
          gap: `${GAP}px`,
        }}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
          const revealDelay = i * 0.06;
          return (
            <Box
              key={i}
              sx={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                borderRadius: '4px',
                backgroundColor: theme.palette.primary.main,
                animation: prefersReducedMotion
                  ? 'none'
                  : exiting
                    ? `${gridExit} 0.28s ease-in both`
                    : `${gridReveal} 0.5s ease-out ${revealDelay}s both, ${pulseGlow} 2s ease-in-out ${i * 0.12}s infinite`,
              }}
            />
          );
        })}
      </Box>

      {/* shimmer text */}
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          background: `linear-gradient(90deg, ${theme.palette.text.secondary} 0%, ${theme.palette.primary.light} 50%, ${theme.palette.text.secondary} 100%)`,
          backgroundSize: '200% auto',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: prefersReducedMotion
            ? 'none'
            : exiting
              ? `${fadeOut} 0.25s ease-in both`
              : `${shimmer} 2s linear infinite`,
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
        }}
      >
        {title}
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: 'text.disabled',
          animation: prefersReducedMotion
            ? 'none'
            : exiting
              ? `${fadeOut} 0.25s ease-in both`
              : `${fadeInUp} 0.6s ease-out 0.8s both`,
          fontSize: { xs: '0.75rem', sm: '0.875rem' },
        }}
      >
        {subtitle}
      </Typography>
    </Box>
  );
}
