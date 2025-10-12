import { Box, Paper, Typography } from '@mui/material';
import LandingSectionContainer from './LandingSectionContainer';

export default function LandingExample() {
  return (
    <LandingSectionContainer>
      <Typography
        variant="h3"
        component="h3"
        gutterBottom
        sx={{
          textAlign: 'center',
          mb: 2,
          fontWeight: 700,
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}
      >
        See It In Action
      </Typography>
      <Typography
        variant="h6"
        sx={{
          textAlign: 'center',
          mb: 6,
          maxWidth: 600,
          mx: 'auto',
          fontWeight: 400,
          opacity: 0.9,
        }}
      >
        Here's how winners are determined each quarter
      </Typography>

      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 4,
            mb: 4,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 3,
              backgroundColor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'white' }}>
              🏈 Game Situation
            </Typography>
            <Typography variant="body1" sx={{ mb: 1, color: 'rgba(255,255,255,0.9)' }}>
              End of 1st Quarter
            </Typography>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 3,
              backgroundColor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'white' }}>
              📊 Current Score
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              Home Team <strong>14</strong> - Away Team <strong>7</strong>
            </Typography>
          </Paper>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 3,
            backgroundColor: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(255,255,255,0.3)',
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'white' }}>
            🎯 Winning Square
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: 'rgba(255,255,255,0.9)' }}>
            Last digits: <strong>4</strong> (Home) × <strong>7</strong> (Away)
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 'bold',
              color: '#FFD700',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            Square (4,7) Wins! 🏆
          </Typography>
        </Paper>
      </Box>
    </LandingSectionContainer>
  );
}
