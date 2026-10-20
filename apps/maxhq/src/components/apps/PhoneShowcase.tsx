import BoltIcon from '@mui/icons-material/Bolt';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GridViewIcon from '@mui/icons-material/GridView';
import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { easing, fonts, primaryTint } from '../../theme';
import SquaresBoard from './SquaresBoard';

interface Callout {
  icon: ReactNode;
  title: string;
  detail: string;
  position: Record<string, string>;
  delay: number;
  accent?: boolean;
}

const callouts: Callout[] = [
  {
    icon: <EmojiEventsIcon fontSize="small" />,
    title: 'Q3 winner',
    detail: 'the lit square takes the quarter',
    position: { top: '16%', right: 'calc(100% + 28px)' },
    delay: 300,
    accent: true,
  },
  {
    icon: <BoltIcon fontSize="small" />,
    title: 'Live',
    detail: 'scores update on their own',
    position: { top: '44%', left: 'calc(100% + 28px)' },
    delay: 450,
  },
  {
    icon: <GridViewIcon fontSize="small" />,
    title: 'Your squares',
    detail: 'claimed with your initials',
    position: { bottom: '12%', right: 'calc(100% + 28px)' },
    delay: 600,
  },
];

// the squares board on a phone, with the moments that matter called out around it
export default function PhoneShowcase() {
  return (
    <Box sx={{ position: 'relative', width: 'min(360px, 100%)', mx: 'auto' }}>
      <Box
        aria-hidden
        sx={{
          position: 'relative',
          p: 1.25,
          borderRadius: '44px',
          bgcolor: '#0d1117',
          border: '1px solid #30363d',
          boxShadow: (theme) =>
            `0 50px 120px -40px ${primaryTint(theme, 0.55)}, 0 30px 60px -30px rgba(1, 4, 9, 0.8)`,
        }}
      >
        <Box
          sx={{
            overflow: 'hidden',
            borderRadius: '34px',
            bgcolor: '#060a14',
            color: '#eef2fa',
            px: 2.25,
            pt: 4,
            pb: 3.5,
          }}
        >
          {/* the dynamic island */}
          <Box
            sx={{
              position: 'absolute',
              top: 22,
              left: '50%',
              width: 96,
              height: 26,
              borderRadius: 999,
              bgcolor: '#000',
              transform: 'translateX(-50%)',
            }}
          />

          <Typography
            sx={{
              mt: 2,
              fontWeight: 700,
              fontSize: '1.1rem',
              textAlign: 'center',
              color: '#eef2fa',
            }}
          >
            Sunday Night Showdown
          </Typography>

          {/* score bug */}
          <Box
            sx={{
              my: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1.5,
              py: 0.75,
              borderRadius: '10px',
              border: '1px solid #1e2b47',
              fontFamily: fonts.mono,
              fontSize: '0.74rem',
              color: '#93a0ba',
            }}
          >
            <span>AWAY 21</span>
            <Box
              component="span"
              sx={{
                px: 1,
                borderRadius: '6px',
                bgcolor: '#f7c948',
                color: '#1d1503',
                fontWeight: 700,
              }}
            >
              END Q3
            </Box>
            <span>HOME 10</span>
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              // the board reads its colors from the theme, so pin them to the app's dark field
              '--mui-palette-text-secondary': '#93a0ba',
              '--mui-palette-divider': '#1e2b47',
              '--mui-palette-background-default': '#0b1222',
            }}
          >
            <SquaresBoard />
          </Box>
        </Box>
      </Box>

      {callouts.map((callout) => (
        <Box
          key={callout.title}
          sx={{
            position: 'absolute',
            ...callout.position,
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            gap: 1.25,
            width: 'max-content',
            textAlign: 'left',
            px: 1.75,
            py: 1.25,
            borderRadius: '12px',
            border: 1,
            borderColor: callout.accent ? 'secondary.main' : 'divider',
            bgcolor: 'background.paper',
            boxShadow: '0 18px 40px -18px rgba(1, 4, 9, 0.7)',
            animation: `callout-in 700ms ${easing.reveal} ${callout.delay}ms both`,
            '@keyframes callout-in': {
              from: { opacity: 0, transform: 'translateY(10px) scale(0.96)' },
              to: { opacity: 1, transform: 'none' },
            },
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          <Box sx={{ display: 'flex', color: callout.accent ? 'secondary.main' : 'primary.main' }}>
            {callout.icon}
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 650, fontSize: '0.86rem', color: 'text.primary' }}>
              {callout.title}
            </Typography>
            <Typography sx={{ fontSize: '0.74rem' }}>{callout.detail}</Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
