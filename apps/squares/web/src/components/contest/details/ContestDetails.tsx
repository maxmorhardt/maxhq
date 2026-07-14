import { Casino, Info } from '@mui/icons-material';
import { Box, Button, Divider, Typography } from '@mui/material';
import { useAuth } from 'react-oidc-context';
import {
  selectCurrentContest,
  selectParticipants,
} from '../../../features/contests/contestSelectors';
import { useAppSelector } from '../../../hooks/reduxHooks';
import { isInGameStatus } from '../../../utils/contestStatus';
import { formatMatchup } from '../../../utils/game';
import ContestSidebarCard from '../sidebar/ContestSidebarCard';
import ActiveContestControls from './ActiveContestControls';
import ContestActionIcons from './ContestActionIcons';
import ScoreUpdateControls from './ScoreUpdateControls';
import StartGameButton from './StartGameButton';

interface ContestDetailsProps {
  isOwner?: boolean;
  onRandomSquare?: () => void;
  randomSquareLoading?: boolean;
}

export default function ContestDetails({
  isOwner = false,
  onRandomSquare,
  randomSquareLoading = false,
}: ContestDetailsProps) {
  const auth = useAuth();
  const currentContest = useAppSelector(selectCurrentContest);
  const participants = useAppSelector(selectParticipants);

  if (!currentContest || !currentContest.squares) {
    return;
  }

  const currentUsername = auth.user?.profile?.email;
  const currentParticipant = participants.find((p) => p.userId === currentUsername);
  const isParticipant = !!currentParticipant;
  const squaresClaimed = currentContest.squares.filter((s) => s.owner === currentUsername).length;
  const isPublicContest = currentContest.visibility === 'public';

  const contestStatus = currentContest.status;
  const totalSquares = currentContest.squares.length;
  const filledSquares = currentContest.squares.filter(
    (s) => s.value && s.value.trim() !== ''
  ).length;

  const isCanceled = contestStatus === 'DELETED';
  const isFinished = contestStatus === 'FINISHED';
  const isActive = contestStatus === 'ACTIVE';
  const isInGame = isInGameStatus(contestStatus);
  const allSquaresFilled = filledSquares >= totalSquares;
  const isGameLinked = !!currentContest.gameId;

  const getStatusDisplay = () => {
    if (isCanceled) {
      return 'Deleted';
    }

    if (isFinished) {
      return 'Finished';
    }

    if (isInGame) {
      return `In Progress • ${contestStatus}`;
    }

    return 'Active';
  };

  const showRandomButton =
    isActive &&
    !allSquaresFilled &&
    auth.isAuthenticated &&
    isParticipant &&
    squaresClaimed < (currentParticipant?.maxSquares ?? 0);

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
          {isActive && (
            <Typography
              variant="body2"
              sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', mt: 0.5 }}
            >
              {filledSquares}/{totalSquares} squares filled
              {auth.isAuthenticated && currentParticipant && (
                <Typography
                  component="span"
                  variant="body2"
                  sx={{
                    color:
                      squaresClaimed >= currentParticipant.maxSquares
                        ? '#43e97b'
                        : 'rgba(255,255,255,0.5)',
                    fontSize: '0.75rem',
                  }}
                >
                  {' · '}
                  {squaresClaimed}/{currentParticipant.maxSquares}
                </Typography>
              )}
            </Typography>
          )}
        </Box>

        {/* random square button available to any participant during fill phase */}
        {showRandomButton && (
          <Button
            variant="outlined"
            startIcon={<Casino />}
            onClick={onRandomSquare}
            disabled={randomSquareLoading}
            size="small"
            fullWidth
          >
            {randomSquareLoading ? 'Selecting...' : 'Randomly Select Square'}
          </Button>
        )}

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

            {/* manual contests are started by the owner; linked ones start at kickoff */}
            {isActive && allSquaresFilled && !isGameLinked && <StartGameButton />}

            {isActive && allSquaresFilled && isGameLinked && (
              <Typography
                variant="body2"
                sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', mt: 0.5 }}
              >
                The grid is full. This contest starts automatically when the linked game kicks off.
              </Typography>
            )}

            {isActive && !allSquaresFilled && (
              <ActiveContestControls allSquaresFilled={allSquaresFilled} />
            )}

            {/* manual scoring stays available as a fallback for contests not linked to a game */}
            {isInGame && !isGameLinked && <ScoreUpdateControls />}

            {isInGame && isGameLinked && (
              <Typography
                variant="body2"
                sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', mt: 0.5 }}
              >
                Scores update automatically from the linked game
                {currentContest.game ? ` (${formatMatchup(currentContest.game)})` : ''}.
              </Typography>
            )}
          </>
        )}
      </Box>

      <ContestActionIcons isOwner={isOwner} />

      {/* non-participant notice for public contests */}
      {auth.isAuthenticated && isPublicContest && !isParticipant && !isOwner && (
        <>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mt: 1.5 }} />
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.75rem',
              textAlign: 'center',
              mt: 1.5,
            }}
          >
            You're viewing this contest. Get an invite link to participate.
          </Typography>
        </>
      )}
    </ContestSidebarCard>
  );
}
