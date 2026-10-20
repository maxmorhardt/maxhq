import type { SvgIconComponent } from '@mui/icons-material';
import { alpha, Box, Button, Container, keyframes, Typography } from '@mui/material';
import type { ReactNode } from 'react';

const rise = keyframes`
  0% { opacity: 0; transform: translateY(12px); }
  100% { opacity: 1; transform: translateY(0); }
`;

const HINT_TILE_SIZE = 34;
const DEFAULT_ACCENT = '#ff6b6b';

// alpha() throws on values it cannot parse (gradients, theme paths like primary.main)
function accentAlpha(accent: string, opacity: number) {
  try {
    return alpha(accent, opacity);
  } catch {
    return alpha(DEFAULT_ACCENT, opacity);
  }
}

export interface ErrorStateAction {
  label: string;
  onClick: () => void;
  icon?: SvgIconComponent;
  variant?: 'contained' | 'outlined';
}

export interface ErrorStateHint {
  icon: SvgIconComponent;
  text: ReactNode;
}

export interface ErrorStateProps {
  icon: SvgIconComponent;
  label: string;
  title: string;
  description: ReactNode;
  accent?: string;
  actions: ErrorStateAction[];
  hints?: ErrorStateHint[];
  children?: ReactNode;
}

export default function ErrorState({
  icon: Icon,
  label,
  title,
  description,
  accent = DEFAULT_ACCENT,
  actions,
  hints,
  children,
}: ErrorStateProps) {
  const hasHints = Boolean(hints?.length);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 }, px: { xs: 3, sm: 4 } }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: hasHints ? '1fr 1fr' : '1fr' },
          gap: { xs: 4, md: 7 },
          alignItems: 'start',
          animation: `${rise} 0.4s ease-out`,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Icon sx={{ fontSize: 22, color: accent }} />
            <Typography
              sx={{
                color: accent,
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
              }}
            >
              {label}
            </Typography>
          </Box>

          <Typography
            component="h1"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '2rem', md: '2.5rem' },
              lineHeight: 1.12,
              letterSpacing: '-0.025em',
              color: 'white',
              mb: 1.5,
            }}
          >
            {title}
          </Typography>

          <Typography
            sx={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: '1rem',
              lineHeight: 1.65,
              maxWidth: 440,
              mb: 3.5,
            }}
          >
            {description}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              flexWrap: 'wrap',
              gap: 1.75,
            }}
          >
            {actions.map((action, i) => {
              const ActionIcon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant={action.variant ?? (i === 0 ? 'contained' : 'outlined')}
                  onClick={action.onClick}
                  startIcon={ActionIcon ? <ActionIcon /> : undefined}
                  sx={{
                    px: 3.25,
                    py: 1.1,
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    borderRadius: 2,
                    textTransform: 'none',
                    ...(action.variant === 'outlined' || (!action.variant && i > 0)
                      ? {
                          color: 'rgba(255,255,255,0.75)',
                          borderColor: 'rgba(255,255,255,0.2)',
                        }
                      : {}),
                  }}
                >
                  {action.label}
                </Button>
              );
            })}
          </Box>
        </Box>

        {hasHints && (
          <Box
            sx={{
              borderLeft: { md: '1px solid rgba(255,255,255,0.08)' },
              borderTop: { xs: '1px solid rgba(255,255,255,0.08)', md: 'none' },
              pl: { md: 4.5 },
              pt: { xs: 3.5, md: 0.5 },
            }}
          >
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.35)',
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                mb: 2.5,
              }}
            >
              What you can do
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {hints?.map((hint, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1.75, alignItems: 'center' }}>
                  <Box
                    sx={{
                      flexShrink: 0,
                      width: HINT_TILE_SIZE,
                      height: HINT_TILE_SIZE,
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: accentAlpha(accent, 0.08),
                      border: `1px solid ${accentAlpha(accent, 0.2)}`,
                    }}
                  >
                    <hint.icon sx={{ fontSize: 18, color: accent, display: 'block' }} />
                  </Box>
                  <Typography
                    sx={{
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                    }}
                  >
                    {hint.text}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {children}
    </Container>
  );
}
