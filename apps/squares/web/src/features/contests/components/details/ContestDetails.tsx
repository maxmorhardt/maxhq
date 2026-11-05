import { GridView, InfoOutlined } from '@mui/icons-material';
import { Box, LinearProgress, Typography } from '@mui/material';
import { fonts } from '../../../../app/theme';
import type { Contest, Game, Participant } from '../../../../types/contest';
import { isInGameStatus } from '../../../../utils/contestStatus';
import { formatKickoff } from '../../../../utils/game';
import type { ContestViewer } from '../../live/viewer';
import ContestSidebarCard from '../sidebar/ContestSidebarCard';
import SquareActions from './SquareActions';

interface Props {
  contest: Contest;
  game?: Game;
  participants: Participant[];
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

function ownerWarning(contest: Contest, participants: Participant[]): string | null {
  const others = participants.filter((p) => p.role !== 'owner');
  if (others.length === 0) {
    return 'No one has joined yet. Share your invite link.';
  }

  const waiting = others.filter((p) => p.maxSquares === 0).length;
  if (waiting > 0) {
    return waiting === 1
      ? '1 participant has no squares yet. Give them squares in Participants.'
      : `${waiting} participants have no squares yet. Give them squares in Participants.`;
  }

  const allocated = participants.reduce((sum, p) => sum + p.maxSquares, 0);
  const unallocated = contest.squares.length - allocated;
  if (unallocated > 0) {
    return unallocated === 1
      ? '1 square isn’t given to anyone, so the board can’t fill.'
      : `${unallocated} squares aren’t given to anyone, so the board can’t fill.`;
  }
  return null;
}

export default function ContestDetails({ contest, game, participants, viewer }: Props) {
  const totalSquares = contest.squares.length;
  const filledSquares = contest.squares.filter((s) => s.value.trim() !== '').length;
  const allFilled = filledSquares >= totalSquares;
  const isActive = contest.status === 'ACTIVE';
  const { participant } = viewer;
  const warning =
    viewer.isOwner && isActive && !allFilled ? ownerWarning(contest, participants) : null;
  const waitingForSquares = !viewer.isOwner && participant?.maxSquares === 0;

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
          {warning && (
            <Box
              role="status"
              sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'flex-start',
                mt: 1.5,
                p: 1.25,
                borderRadius: 1,
                bgcolor: 'rgba(247, 201, 72, 0.08)',
                color: 'warning.main',
                fontSize: '0.85rem',
                lineHeight: 1.45,
              }}
            >
              <InfoOutlined sx={{ fontSize: '1.1rem', mt: '1px' }} />
              {warning}
            </Box>
          )}
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
            {waitingForSquares && isActive && (
              <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                The owner hasn&apos;t given you any squares yet.
              </Typography>
            )}
            {/* a full board is locked, so there is nothing left to claim or clear */}
            {isActive && !allFilled && !waitingForSquares && (
              <SquareActions
                contest={contest}
                viewer={viewer}
                emptySquares={totalSquares - filledSquares}
              />
            )}
          </Box>
        )}
      </Box>
    </ContestSidebarCard>
  );
}
