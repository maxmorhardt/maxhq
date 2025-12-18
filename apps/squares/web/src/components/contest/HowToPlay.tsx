import { Box, Typography } from '@mui/material';
import { Help } from '@mui/icons-material';
import ContestSidebarCard from './ContestSidebarCard';

export default function HowToPlay() {
  return (
    <ContestSidebarCard icon={<Help />} iconColor="#667eea" title="How to Play">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            1. Pick Your Square
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
            Click on any available square to claim it
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            2. Enter Your Info
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
            Fill in your name to secure your spot
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            3. Numbers Assigned
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
            Once all squares are filled, numbers are randomly assigned
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            4. Win Prizes
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
            When your square matches the score at quarter end, you win!
          </Typography>
        </Box>
      </Box>
    </ContestSidebarCard>
  );
}
