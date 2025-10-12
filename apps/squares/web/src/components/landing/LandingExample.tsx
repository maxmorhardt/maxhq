import { Box, Typography, useTheme } from '@mui/material';
import LandingSectionContainer from './LandingSectionContainer';
import ExampleCard from './ExampleCard';

export default function LandingExample() {
  const theme = useTheme();

  return (
    <LandingSectionContainer variant="lightBlue">
      <Typography
        variant="h3"
        gutterBottom
        sx={{
          textAlign: 'center',
          mb: 2,
          fontWeight: 700,
          textShadow: theme.customShadows.text,
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
          <ExampleCard title="🏈 Game Situation">
            <Typography variant="body1" sx={{ color: theme.customColors.textMuted }}>
              End of 1st Quarter
            </Typography>
          </ExampleCard>

          <ExampleCard title="📊 Current Score">
            <Typography variant="body1" sx={{ color: theme.customColors.textMuted }}>
              Home Team <strong>14</strong> - Away Team <strong>7</strong>
            </Typography>
          </ExampleCard>
        </Box>

        <ExampleCard title="🎯 Winning Square" isCentered>
          <Typography variant="body1" sx={{ mb: 2, color: theme.customColors.textMuted }}>
            Last digits: <strong>4</strong> (Home) × <strong>7</strong> (Away)
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 'bold',
              color: '#FFD700',
              textShadow: theme.customShadows.text,
            }}
          >
            Square (4,7) Wins! 🏆
          </Typography>
        </ExampleCard>
      </Box>
    </LandingSectionContainer>
  );
}
