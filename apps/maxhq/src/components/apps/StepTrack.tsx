import { Box, Typography } from '@mui/material';
import { useScrollProgress } from '../../hooks/useScrollProgress';
import { fonts, primaryTint } from '../../theme';

interface TrackStep {
  title: string;
  body: string;
}

const START = 0.15;
const SPAN = 0.55;

// how far through the track the light has reached, and when step i has been passed
const lineFill = `clamp(0, calc((var(--progress, 0) - ${START}) / ${SPAN}), 1)`;
const lit = (i: number, count: number) =>
  `clamp(0, calc((var(--progress, 0) - ${START + (SPAN * i) / Math.max(count - 1, 1)}) * 12), 1)`;

export default function StepTrack({ steps }: { steps: TrackStep[] }) {
  const track = useScrollProgress<HTMLOListElement>({ anchor: 0.8 });

  return (
    <Box
      component="ol"
      ref={track}
      sx={{
        position: 'relative',
        m: 0,
        p: 0,
        listStyle: 'none',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: `repeat(${steps.length}, minmax(0, 1fr))` },
        gap: 4,
      }}
    >
      {/* the track and its light */}
      <Box
        aria-hidden
        sx={{
          display: { xs: 'none', md: 'block' },
          position: 'absolute',
          bgcolor: 'divider',
          top: 21,
          left: 22,
          right: `calc((100% - ${(steps.length - 1) * 32}px) / ${steps.length} - 22px)`,
          height: 2,
        }}
      >
        <Box
          sx={(theme) => {
            const { palette } = theme.vars ?? theme;

            return {
              position: 'absolute',
              inset: 0,
              transformOrigin: 'left',
              transform: `scaleX(${lineFill})`,
              background: `linear-gradient(90deg, ${palette.primary.main}, ${palette.secondary.main})`,
            };
          }}
        />
      </Box>

      {steps.map((step, i) => (
        <Box
          key={step.title}
          component="li"
          sx={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: { xs: 'auto 1fr', md: '1fr' },
            gap: 2.5,
          }}
        >
          <Box
            sx={{
              position: 'relative',
              display: 'grid',
              placeItems: 'center',
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: 1,
              borderColor: 'divider',
              bgcolor: 'background.default',
              fontFamily: fonts.mono,
              fontWeight: 600,
              color: 'text.secondary',
            }}
          >
            {i + 1}
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                inset: -1,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                border: 1,
                borderColor: 'primary.main',
                bgcolor: (theme) => primaryTint(theme, 0.16),
                color: 'primary.main',
                opacity: lit(i, steps.length),
              }}
            >
              {i + 1}
            </Box>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h3" sx={{ mb: 0.75, fontSize: '1.15rem' }}>
              {step.title}
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: '40ch' }}>
              {step.body}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
