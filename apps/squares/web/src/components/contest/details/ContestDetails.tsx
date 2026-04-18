import { Info } from '@mui/icons-material';
import { Box, Typography } from '@mui/material';
import { selectCurrentContest } from '../../../features/contests/contestSelectors';
import { useAppSelector } from '../../../hooks/reduxHooks';
import ContestSidebarCard from '../sidebar/ContestSidebarCard';
import ActiveContestControls from './ActiveContestControls';
import ContestActionIcons from './ContestActionIcons';
import ScoreUpdateControls from './ScoreUpdateControls';
import StartGameButton from './StartGameButton';

interface ContestDetailsProps {
  isOwner?: boolean;
  onRandomSquare?: () => void;
}

export default function ContestDetails({ isOwner = false, onRandomSquare }: ContestDetailsProps) {
  const currentContest = useAppSelector(selectCurrentContest);

  if (!currentContest || !currentContest.squares) {
    return;
  }

  const contestStatus = currentContest.status;
  const totalSquares = currentContest.squares.length;
  const filledSquares = currentContest.squares.filter(
    (s) => s.value && s.value.trim() !== ''
  ).length;

  const isCanceled = contestStatus === 'DELETED';
  const isFinished = contestStatus === 'FINISHED';
  const isActive = contestStatus === 'ACTIVE';
  const isInGame = ['Q1', 'Q2', 'Q3', 'Q4'].includes(contestStatus);
  const allSquaresFilled = filledSquares >= totalSquares;

  const getStatusDisplay = () => {
    if (isCanceled) return 'Deleted';
    if (isFinished) return 'Finished';
    if (isInGame) return `In Progress • ${contestStatus}`;
    return `Active • ${filledSquares}/${totalSquares} Squares Filled`;
  };

  return (
    <ContestSidebarCard icon={<Info />} iconColor="#4facfe" title="Contest Details">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {/* status display visible to everyone */}
        <Box>
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 0.5, fontSize: '0.7rem' }}
          >
            Contest Status
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500, fontSize: '0.8rem' }}
          >
            {getStatusDisplay()}
          </Typography>
        </Box>

        {/* owner controls section */}
        {isOwner && (
          <>
            {(isCanceled || isFinished) && (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  No actions available
                </Typography>
              </Box>
            )}

            {isActive && allSquaresFilled && <StartGameButton />}

            {isActive && !allSquaresFilled && (
              <ActiveContestControls
                allSquaresFilled={allSquaresFilled}
                hasEmptySquares={filledSquares < totalSquares}
                onRandomSquare={onRandomSquare}
              />
            )}

            {isInGame && <ScoreUpdateControls />}
          </>
        )}
      </Box>

      <ContestActionIcons isOwner={isOwner} />
    </ContestSidebarCard>
  );
}
