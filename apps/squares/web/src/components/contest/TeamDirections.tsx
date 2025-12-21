import { ArrowForward, ArrowDownward } from '@mui/icons-material';
import { Box, Typography } from '@mui/material';
import { selectCurrentContest } from '../../features/contests/contestSelectors';
import { useAppSelector } from '../../hooks/reduxHooks';
import ContestSidebarCard from './ContestSidebarCard';

// card showing which team is on which axis of the grid
export default function TeamDirections() {
  const currentContest = useAppSelector(selectCurrentContest);

  if (!currentContest) {
    return;
  }

  return (
    <ContestSidebarCard icon={<ArrowForward />} iconColor="#a78bfa" title="Team Directions">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* away team (horizontal/top) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ArrowForward sx={{ color: '#4facfe' }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
              {currentContest.awayTeam || 'Away Team'}
            </Typography>

            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              Horizontal (Top)
            </Typography>
          </Box>
        </Box>

        {/* home team (vertical/left) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ArrowDownward sx={{ color: '#43e97b' }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
              {currentContest.homeTeam || 'Home Team'}
            </Typography>

            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              Vertical (Left)
            </Typography>
          </Box>
        </Box>
      </Box>
    </ContestSidebarCard>
  );
}
