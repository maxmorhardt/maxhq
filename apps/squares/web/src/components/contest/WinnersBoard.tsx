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
    const name = `${result.winnerFirstName} ${result.winnerLastName}`;
    if (name.length < MAX_NAME_LENGTH) {
      return name;
    }

    const truncatedNameLength = MAX_NAME_LENGTH - 3;
    return `${name.substring(0, truncatedNameLength)}...`;
  };

  return (
    <ContestSidebarCard icon={<span style={{ fontSize: '1.3rem' }}>🏆</span>} title="Winners Board">
      {/* winners list */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
        {quarterResults.length > 0 ? (
          quarterResults.map((result) => (
            /* winner card */
            <Box
              key={result.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 1.2,
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 1.2,
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
                  marginRight: '1rem',
                  p: 1,
                }}
              >
                <Typography
                  sx={{
                    color: '#43e97b',
                    fontWeight: 'bold',
                    fontSize: '0.75rem',
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
                    fontSize: '0.875rem',
                  }}
                >
                  {formatWinnerName(result)}
                </Typography>

                <Typography
                  variant="caption"
                  sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem' }}
                >
                  Square {getSquareLabel(result)}
                </Typography>
              </Box>
              {/* spacer to balance the quarter badge on the left */}
              <Box sx={{ minWidth: 42, flexShrink: 0 }} />
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
