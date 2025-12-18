import { Box, Typography } from '@mui/material';
import ContestSidebarCard from './ContestSidebarCard';

interface Winner {
  id: string;
  name: string;
  square: string;
  quarter: string;
}

interface WinnersBoardProps {
  winners?: Winner[];
}

export default function WinnersBoard({ winners = [] }: WinnersBoardProps) {
  return (
    <ContestSidebarCard icon={<span style={{ fontSize: '1.5rem' }}>🏆</span>} title="Winners Board">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {winners.length > 0 ? (
          winners.map((winner, index) => (
            <Box
              key={winner.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 1.5,
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background:
                    index === 0
                      ? 'transparent'
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: index === 0 ? '1.5rem' : '0.75rem',
                  fontWeight: 'bold',
                  flexShrink: 0,
                  filter: index === 0 ? 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.5))' : 'none',
                }}
              >
                {index === 0 ? '🏆' : index + 1}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 'bold',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {winner.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  Square {winner.square} • {winner.quarter}
                </Typography>
              </Box>
            </Box>
          ))
        ) : (
          <Box
            sx={{
              textAlign: 'center',
              py: 4,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255,255,255,0.5)',
                mb: 1,
              }}
            >
              No winners yet
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255,255,255,0.3)',
              }}
            >
              Winners will appear here as the game progresses
            </Typography>
          </Box>
        )}
      </Box>
    </ContestSidebarCard>
  );
}
