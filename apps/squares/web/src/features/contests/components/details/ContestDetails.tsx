import { GridView } from '@mui/icons-material';
import { Box, LinearProgress, Typography } from '@mui/material';
import { fonts } from '../../../../app/theme';
import type { Contest, Game } from '../../../../types/contest';
import { isInGameStatus } from '../../../../utils/contestStatus';
import { formatKickoff } from '../../../../utils/game';
import type { ContestViewer } from '../../live/viewer';
import ContestSidebarCard from '../sidebar/ContestSidebarCard';
import SquareActions from './SquareActions';

interface Props {
  contest: Contest;
  game?: Game;
  viewer: ContestViewer;
}

const barSx = { height: 8, borderRadius: 4, bgcolor: 'rgba(238, 242, 250, 0.08)' };

// what happens next to the board, in the contest's own terms
function boardStatus(contest: Contest, game: Game | undefined, allFilled: boolean): string {
  const kickoff = game?.status === 'scheduled' ? ` (${formatKickoff(game.gameTime)})` : '';

  if (contest.status === 'DELETED') {
    return 'This contest was deleted.';
  }
  if (contest.status === 'FINISHED') {
    return 'Final. Every quarter has been called.';
  }
  if (isInGameStatus(contest.status)) {
    return 'The board is locked and the numbers are drawn. Each quarter’s winner comes from the live score.';
  }
  return allFilled
    ? `The board is full and locked. The numbers are drawn at kickoff${kickoff}.`
    : `Fill every square before kickoff${kickoff}. The board locks once the game starts and every square is claimed.`;
}

export default function ContestDetails({ contest, game, viewer }: Props) {
  const totalSquares = contest.squares.length;
  const filledSquares = contest.squares.filter((s) => s.value.trim() !== '').length;
  const allFilled = filledSquares >= totalSquares;
  const isActive = contest.status === 'ACTIVE';
  const { participant } = viewer;

  return (
    <ContestSidebarCard icon={<GridView fontSize="small" />} title="The Board">
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Box>
          <Box
            sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1 }}
          >
            <Typography
              sx={{
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: '2rem',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {filledSquares}
              <Box component="span" sx={{ color: 'text.secondary', fontSize: '1.1rem' }}>
                /{totalSquares}
              </Box>
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
              {allFilled ? 'Board full' : `${totalSquares - filledSquares} open`}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            aria-label="squares claimed"
            value={totalSquares ? (filledSquares / totalSquares) * 100 : 0}
            sx={barSx}
          />
          <Typography
            sx={{ color: 'text.secondary', fontSize: '0.85rem', mt: 1.25, lineHeight: 1.5 }}
          >
            {boardStatus(contest, game, allFilled)}
          </Typography>
        </Box>

        {participant && (
          <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                mb: 1,
              }}
            >
              <Typography sx={{ fontWeight: 600 }}>Your squares</Typography>
              <Typography
                sx={{
                  fontFamily: fonts.display,
                  fontWeight: 800,
                  fontSize: '1.25rem',
                  fontVariantNumeric: 'tabular-nums',
                  color: viewer.squaresLeft === 0 ? 'primary.main' : 'text.primary',
                }}
              >
                {viewer.squaresClaimed}/{participant.maxSquares}
              </Typography>
            </Box>
            {/* a full board is locked, so there is nothing left to claim or clear */}
            {isActive && !allFilled && (
              <SquareActions
                contest={contest}
                viewer={viewer}
                emptySquares={totalSquares - filledSquares}
              />
            )}
          </Box>
        )}

        {/* a signed-in viewer of a public contest can watch but not play */}
        {contest.visibility === 'public' && !viewer.isParticipant && !viewer.isOwner && (
          <Typography
            sx={{
              pt: 2,
              borderTop: 1,
              borderColor: 'divider',
              color: 'text.secondary',
              fontSize: '0.85rem',
            }}
          >
            You&apos;re watching this contest. Ask the owner for an invite link to play.
          </Typography>
        )}
      </Box>
    </ContestSidebarCard>
  );
}
