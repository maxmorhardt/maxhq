import { Box, Container, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { easing, fonts } from '../../../app/theme';
import Reveal from '../../../components/Reveal';
import { HEADER_HEIGHT } from '../../../types/layout';
import DemoBoard, { type DemoStage } from './DemoBoard';

interface Step {
  title: string;
  body: string;
}

const steps: Step[] = [
  {
    title: 'Set up the board',
    body: 'Name the contest, link a live NFL game or enter the teams yourself, and share the invite link. Private or public, it is your pool.',
  },
  {
    title: 'Claim your squares',
    body: 'Everyone signs in and taps the squares they want. Each one shows its owner’s initials, and the board fills in for everyone at once.',
  },
  {
    title: 'Numbers are drawn',
    body: 'When the game starts, the digits 0 to 9 are drawn at random along each team’s axis. Nobody knows which squares are good until now.',
  },
  {
    title: 'Winners light up',
    body: 'At the end of every quarter, the last digit of each score picks the winner. Away 7, home 14: the square where away 7 meets home 4 takes it.',
  },
];

export default function LandingPlaybook() {
  const [active, setActive] = useState<DemoStage>(0);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);

  // the step crossing the middle of the viewport drives the pinned board
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(Number((entry.target as HTMLElement).dataset.step) as DemoStage);
          }
        }
      },
      { rootMargin: '-50% 0px -50% 0px' }
    );

    stepRefs.current.forEach((step) => step && observer.observe(step));
    return () => observer.disconnect();
  }, []);

  return (
    <Box component="section" id="how-it-works" sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Reveal sx={{ maxWidth: 640, mb: { xs: 4, md: 2 } }}>
          <Typography variant="h2" sx={{ fontSize: 'clamp(2.6rem, 5.6vw, 4.4rem)' }}>
            How a pool plays out
          </Typography>
          <Typography sx={{ mt: 2, color: 'text.secondary', fontSize: '1.1rem', maxWidth: '48ch' }}>
            Four moments, from the invite link to the winning square.
          </Typography>
        </Reveal>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { md: 'minmax(0, 0.85fr) minmax(0, 1fr)' },
            gap: { md: 8 },
          }}
        >
          <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
            {steps.map((step, i) => (
              <Box
                key={step.title}
                component="li"
                data-step={i}
                ref={(node: HTMLElement | null) => {
                  stepRefs.current[i] = node;
                }}
                aria-current={active === i ? 'step' : undefined}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  minHeight: { md: '68vh' },
                  py: { xs: 4, md: 0 },
                  opacity: { md: active === i ? 1 : 0.32 },
                  transition: `opacity 500ms ${easing.out}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: fonts.display,
                      fontWeight: 800,
                      fontSize: '3.4rem',
                      lineHeight: 0.8,
                      color: i === 3 ? 'secondary.main' : 'primary.main',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {i + 1}
                  </Typography>
                  <Typography variant="h3" sx={{ fontSize: 'clamp(1.9rem, 3.4vw, 2.6rem)' }}>
                    {step.title}
                  </Typography>
                </Box>
                <Typography
                  sx={{ mt: 2, maxWidth: '42ch', color: 'text.secondary', fontSize: '1.08rem' }}
                >
                  {step.body}
                </Typography>

                {/* on small screens every step carries its own board */}
                <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', mt: 3 }}>
                  <DemoBoard stage={i as DemoStage} />
                </Box>
              </Box>
            ))}
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <Box
              sx={{
                position: 'sticky',
                top: `max(${HEADER_HEIGHT.sm + 16}px, calc(${HEADER_HEIGHT.sm}px + (100vh - ${HEADER_HEIGHT.sm}px - 620px) / 2))`,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <DemoBoard stage={active} />
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
