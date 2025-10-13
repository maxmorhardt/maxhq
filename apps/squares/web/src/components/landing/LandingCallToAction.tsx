import { Box, Typography } from '@mui/material';
import LandingSectionContainer from './LandingSectionContainer';
import LandingCreateContestButton from './LandingCreateContestButton';

export default function LandingCallToAction() {
  return (
    <LandingSectionContainer variant="lightBlue">
      <Typography
        variant="h3"
        gutterBottom
        sx={{
          fontWeight: 700,
          color: 'white',
          mb: 2,
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}
      >
        Ready to Get Started?
      </Typography>

      <Typography
        variant="h6"
        sx={{
          mb: 4,
          color: 'rgba(255,255,255,0.8)',
          maxWidth: 500,
          mx: 'auto',
          fontWeight: 400,
          lineHeight: 1.5,
        }}
      >
        Create your first contest in seconds and share it with your friends and family for an
        unforgettable game experience.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        <LandingCreateContestButton text="Create Contest Now" />
      </Box>

      <Box
        sx={{
          mt: 4,
          display: 'flex',
          justifyContent: 'center',
          gap: 4,
          flexWrap: 'wrap',
          color: 'white',
          opacity: 0.95,
        }}
      >
        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          ✅ No credit card required
        </Typography>
        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          ✅ Setup in under 2 minutes
        </Typography>
        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          ✅ Works on all devices
        </Typography>
      </Box>
    </LandingSectionContainer>
  );
}
