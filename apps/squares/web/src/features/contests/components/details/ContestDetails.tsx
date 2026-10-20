import { Info } from '@mui/icons-material';
import { Box, Divider, Typography } from '@mui/material';
import type { Contest, Participant } from '../../../../types/contest';
import { isInGameStatus } from '../../../../utils/contestStatus';
import { formatMatchup } from '../../../../utils/game';
import type { ContestViewer } from '../../live/viewer';
import ContestSidebarCard from '../sidebar/ContestSidebarCard';
import ContestActionIcons from './ContestActionIcons';
import ScoreUpdateControls from './ScoreUpdateControls';
import SquareActions from './SquareActions';
import StartGameButton from './StartGameButton';

interface Props {
  contest: Contest;
  participants: Participant[];
  viewer: ContestViewer;
  fillHeight?: boolean;
}

const mutedSx = { color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' };

function statusLabel(contest: Contest): string {
  if (contest.status === 'DELETED') {
    return 'Deleted';
  }
  if (contest.status === 'FINISHED') {
    return 'Finished';
  }
  if (isInGameStatus(contest.status)) {
    return `In Progress • ${contest.status}`;
  }
  return 'Active';
}

export default function ContestDetails({
  contest,
  participants,
  viewer,
  fillHeight = false,
}: Props) {
  const totalSquares = contest.squares.length;
  const filledSquares = contest.squares.filter((s) => s.value.trim() !== '').length;
  const allFilled = filledSquares >= totalSquares;

  const isActive = contest.status === 'ACTIVE';
  const isInGame = isInGameStatus(contest.status);
  const isOver = contest.status === 'FINISHED' || contest.status === 'DELETED';
  const isGameLinked = !!contest.gameId;
  const { participant } = viewer;

  return (
    <ContestSidebarCard
      icon={<Info />}
      iconColor="#4facfe"
      title="Contest Details"
      fillHeight={fillHeight}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: fillHeight ? 1.75 : 1.25 }}>
        {/* status, visible to everyone */}
        <Box>
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 0.5, fontSize: '0.8rem' }}
          >
            Contest Status
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500, fontSize: '0.9rem' }}
          >
            {statusLabel(contest)}
          </Typography>
          {isActive && (
            <Typography variant="body2" sx={{ ...mutedSx, mt: 0.5 }}>
              {filledSquares}/{totalSquares} squares filled
              {participant && (
                <Typography
                  component="span"
                  variant="body2"
                  sx={{
                    ...mutedSx,
                    color: viewer.squaresLeft === 0 ? '#43e97b' : mutedSx.color,
                  }}
                >
                  {' · '}
                  {viewer.squaresClaimed}/{participant.maxSquares}
                </Typography>
              )}
            </Typography>
          )}
        </Box>

        {isActive && viewer.isParticipant && (
          <SquareActions
            contest={contest}
            viewer={viewer}
            emptySquares={totalSquares - filledSquares}
          />
        )}

        {/* owner controls */}
        {viewer.isOwner && (
          <>
            {isOver && (
              <Typography variant="body2" sx={{ ...mutedSx, textAlign: 'center', py: 2 }}>
                No actions available
              </Typography>
            )}

            {/* manual contests are started by the owner; linked ones start at kickoff */}
            {isActive && allFilled && !isGameLinked && <StartGameButton contestId={contest.id} />}

            {isActive && allFilled && isGameLinked && (
              <Typography variant="body2" sx={{ ...mutedSx, mt: 0.5 }}>
                The grid is full. This contest starts automatically when the linked game kicks off.
              </Typography>
            )}

            {isActive && !allFilled && (
              <>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}
                >
                  Waiting for all squares to be filled before you can start the game.
                </Typography>
              </>
            )}

            {/* manual scoring stays available as a fallback for contests not linked to a game */}
            {isInGame && !isGameLinked && <ScoreUpdateControls contest={contest} />}

            {isInGame && isGameLinked && (
              <Typography variant="body2" sx={{ ...mutedSx, mt: 0.5 }}>
                Scores update automatically from the linked game
                {contest.game ? ` (${formatMatchup(contest.game)})` : ''}.
              </Typography>
            )}
          </>
        )}
      </Box>

      <Box sx={{ mt: fillHeight ? 'auto' : 0, pt: fillHeight ? 2 : 0, order: fillHeight ? 1 : 0 }}>
        <ContestActionIcons contest={contest} participants={participants} viewer={viewer} />
      </Box>

      {/* a signed-in viewer of a public contest can watch but not play */}
      {contest.visibility === 'public' && !viewer.isParticipant && !viewer.isOwner && (
        <>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mt: 1.5 }} />
          <Typography variant="body2" sx={{ ...mutedSx, textAlign: 'center', mt: 1.5 }}>
            You're viewing this contest. Get an invite link to participate.
          </Typography>
        </>
      )}
    </ContestSidebarCard>
  );
}
