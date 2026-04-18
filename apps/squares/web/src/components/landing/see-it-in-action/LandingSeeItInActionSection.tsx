import { Box, Container, Typography, useTheme } from '@mui/material';
import type { RefObject } from 'react';
import LandingStepCard from './LandingStepCard';

interface Props {
  animRef: RefObject<HTMLDivElement | null>;
  isVisible: boolean;
}

export default function LandingSeeItInActionSection({ animRef, isVisible }: Props) {
  const theme = useTheme();

  return (
    <Container maxWidth="lg" sx={{ mb: 14 }}>
      <Box ref={animRef} className={`scroll-zoom-rotate ${isVisible ? 'visible' : ''}`}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: 2,
              color: 'text.primary',
            }}
          >
            See It In Action
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: 'text.secondary',
              maxWidth: 600,
              mx: 'auto',
              fontWeight: 400,
            }}
          >
            Here's how winners are determined each quarter
          </Typography>
        </Box>

        <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
          <LandingStepCard
            step={1}
            title="🏈 Game Reaches End of Quarter"
            gradient="linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)"
            gradientLight="linear-gradient(135deg, rgba(255, 107, 107, 0.05) 0%, rgba(255, 142, 83, 0.05) 100%)"
            borderColor="#FF6B6B"
            shadowColor="rgba(255, 107, 107, 0.12)"
          >
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                fontSize: { xs: '0.95rem', md: '1.05rem' },
                lineHeight: 1.7,
              }}
            >
              As the quarter ends, check the current score. For this example, it's the{' '}
              <strong>end of the 1st Quarter</strong>.
            </Typography>
          </LandingStepCard>

          <LandingStepCard
            step={2}
            title="📊 Look at the Final Score"
            gradient="linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)"
            gradientLight="linear-gradient(135deg, rgba(79, 172, 254, 0.05) 0%, rgba(0, 242, 254, 0.05) 100%)"
            borderColor="#4FACFE"
            shadowColor="rgba(79, 172, 254, 0.12)"
          >
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                fontSize: { xs: '0.95rem', md: '1.05rem' },
                lineHeight: 1.7,
              }}
            >
              The scoreboard shows <strong>Home Team: 14</strong> and <strong>Away Team: 7</strong>.
              These numbers determine the winning square.
            </Typography>
          </LandingStepCard>

          <LandingStepCard
            step={3}
            title="🎯 Determine the Winner"
            gradient="linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)"
            gradientLight="linear-gradient(135deg, rgba(67, 233, 123, 0.05) 0%, rgba(56, 249, 215, 0.05) 100%)"
            borderColor="#43E97B"
            shadowColor="rgba(67, 233, 123, 0.12)"
          >
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                fontSize: { xs: '0.95rem', md: '1.05rem' },
                lineHeight: 1.7,
                mb: { xs: 2, md: 3 },
              }}
            >
              Take the <strong>last digit</strong> of each score:
            </Typography>
            <Box
              sx={{
                display: 'flex',
                gap: { xs: 1, md: 2 },
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                mb: { xs: 2, md: 3 },
                p: { xs: 2, md: 4 },
                background: theme.palette.grey[900],
                borderRadius: { xs: 2, md: 3 },
                border: '2px solid rgba(76, 175, 80, 0.3)',
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: '#64B5F6',
                  fontSize: { xs: '1.5rem', md: '2.125rem' },
                }}
              >
                <span
                  style={{
                    fontSize: 'clamp(1rem, 3vw, 1.5rem)',
                    color: 'rgba(255, 255, 255, 0.3)',
                  }}
                >
                  1
                </span>
                4
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: 600,
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                }}
              >
                ×
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: '#64B5F6',
                  fontSize: { xs: '1.5rem', md: '2.125rem' },
                }}
              >
                <span
                  style={{
                    fontSize: 'clamp(1rem, 3vw, 1.5rem)',
                    color: 'rgba(255, 255, 255, 0.3)',
                  }}
                >
                  0
                </span>
                7
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  mx: { xs: 0.5, md: 1 },
                  fontWeight: 600,
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                }}
              >
                =
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 900,
                  color: '#66BB6A',
                  px: { xs: 2, md: 3 },
                  py: { xs: 0.5, md: 1 },
                  borderRadius: 2,
                  background: 'rgba(102, 187, 106, 0.2)',
                  border: '2px solid #66BB6A',
                  fontSize: { xs: '1.5rem', md: '2.125rem' },
                }}
              >
                (4, 7)
              </Typography>
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: 'success.main',
                textAlign: 'center',
                mt: { xs: 1.5, md: 2 },
                fontSize: { xs: '1rem', md: '1.25rem' },
              }}
            >
              Square (4, 7) Wins This Quarter! 🏆
            </Typography>
          </LandingStepCard>
        </Box>
      </Box>
    </Container>
  );
}
