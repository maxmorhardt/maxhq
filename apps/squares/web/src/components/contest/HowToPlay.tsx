import { Help } from '@mui/icons-material';
import { Box, Typography } from '@mui/material';
import ContestSidebarCard from './ContestSidebarCard';

export default function HowToPlay() {
  return (
    <ContestSidebarCard icon={<Help />} iconColor="#667eea" title="How to Play">
      {/* instructions list */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.8, textAlign: 'left' }}>
        {/* step 1 */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, textAlign: 'left' }}>
            1. Pick Your Square
          </Typography>

          <Typography
            sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', textAlign: 'left' }}
          >
            Click on any available square to claim it
          </Typography>
        </Box>

        {/* step 2 */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, textAlign: 'left' }}>
            2. Win Prizes
          </Typography>

          <Typography
            sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', textAlign: 'left' }}
          >
            When your square matches the score at quarter end, you win!
          </Typography>
        </Box>
      </Box>
    </ContestSidebarCard>
  );
}
