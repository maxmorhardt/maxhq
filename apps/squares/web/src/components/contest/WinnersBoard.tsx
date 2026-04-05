import { Box, Typography } from '@mui/material';
import type { QuarterResult } from '../../types/contest';
import ContestSidebarCard from './ContestSidebarCard';

const MAX_NAME_LENGTH = 20;

interface WinnersBoardProps {
  quarterResults?: QuarterResult[];
}

export default function WinnersBoard({ quarterResults = [] }: WinnersBoardProps) {
  const getQuarterLabel = (quarter: number) => {
    return `Q${quarter}`;
  };

  const getSquareLabel = (result: QuarterResult) => {
    return `(${result.winnerRow}, ${result.winnerCol})`;
  };

  const formatWinnerName = (result: QuarterResult) => {
    if (!result.winnerName || result.winnerName.length < MAX_NAME_LENGTH) {
      return result.winnerName || '';
    }

    const truncatedNameLength = MAX_NAME_LENGTH - 3;
    return `${result.winnerName.substring(0, truncatedNameLength)}...`;
  };

  return (
    <ContestSidebarCard icon={<span style={{ fontSize: '1.3rem' }}>🏆</span>} title="Winners Board">
      {/* winners list */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {quarterResults.length > 0 ? (
          quarterResults.map((result) => (
            /* winner card */
            <Box
              key={result.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 0.8,
                py: 0.5,
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 1,
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              {/* quarter badge */}
              <Box
                sx={{
                  borderRadius: 1,
                  background: 'rgba(67, 233, 123, 0.15)',
                  border: '1px solid rgba(67, 233, 123, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '0.75rem',
                  px: 0.8,
                  py: 0.3,
                }}
              >
                <Typography
                  sx={{
                    color: '#43e97b',
                    fontWeight: 'bold',
                    fontSize: '0.7rem',
                  }}
                >
                  {getQuarterLabel(result.quarter)}
                </Typography>
              </Box>

              {/* winner info */}
              <Box sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                <Typography
                  sx={{
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    fontSize: '0.8rem',
                  }}
                >
                  {formatWinnerName(result)}
                </Typography>

                <Typography
                  variant="caption"
                  sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}
                >
                  Square {getSquareLabel(result)}
                </Typography>
              </Box>
              {/* spacer to balance the quarter badge on the left */}
              <Box sx={{ minWidth: 36, flexShrink: 0 }} />
            </Box>
          ))
        ) : (
          /* empty state */
          <Box
            sx={{
              textAlign: 'center',
              py: 3,
            }}
          >
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.6)',
                mb: 1,
              }}
            >
              No winners yet
            </Typography>

            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255,255,255,0.4)',
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
