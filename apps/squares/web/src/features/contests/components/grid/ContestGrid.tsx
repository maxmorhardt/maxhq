import { Box, Paper, Typography } from '@mui/material';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { errorMessage, errorStatus } from '../../../../api/errors';
import type { Contest, Square as SquareModel } from '../../../../types/contest';
import { useGetMyProfileQuery } from '../../../profile/api';
import { useToast } from '../../../toast/useToast';
import { useClaimSquareMutation } from '../../api';
import type { ContestViewer } from '../../live/viewer';
import { fonts, game } from '../../../../app/theme';
import Square from './Square';
import SquareDialog from './SquareDialog';

export interface SquarePosition {
  row: number;
  col: number;
}

interface Props {
  contest: Contest;
  viewer: ContestViewer;
  winnerFlash: SquarePosition | null;
  // a claim conflict means the local grid is out of date
  onStale: () => void;
}

const teamLabelSx = {
  color: 'text.primary',
  fontFamily: fonts.display,
  fontWeight: 700,
  fontSize: { xs: '0.8rem', sm: '1rem', md: '1.15rem' },
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  lineHeight: 1,
} as const;

export default function ContestGrid({ contest, viewer, winnerFlash, onStale }: Props) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: profile } = useGetMyProfileQuery();
  const [claimSquare] = useClaimSquareMutation();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // index squares by position so each cell is a lookup, not a scan
  const byPosition = useMemo(() => {
    const map = new Map<string, SquareModel>();
    contest.squares.forEach((square) => map.set(`${square.row}-${square.col}`, square));
    return map;
  }, [contest.squares]);

  const winningPositions = useMemo(
    () => new Set((contest.quarterResults ?? []).map((qr) => `${qr.winnerRow}-${qr.winnerCol}`)),
    [contest.quarterResults]
  );

  const handleSquareClick = async (row: number, col: number) => {
    const square = byPosition.get(`${row}-${col}`);
    if (!square) {
      return;
    }

    const isEmpty = square.value.trim() === '';
    if (!isEmpty || contest.status !== 'ACTIVE') {
      setSelectedId(square.id);
      return;
    }

    if (!viewer.isParticipant && !viewer.isOwner) {
      showToast('You need to be a participant to claim squares', 'info');
      return;
    }
    if (viewer.participant && viewer.squaresLeft === 0) {
      showToast('Square limit reached', 'warning');
      return;
    }
    // claims use the profile's default initials, so they have to exist first
    if (!profile?.defaultInitials) {
      showToast('Set your initials in your profile before claiming a square', 'warning');
      navigate('/profile');
      return;
    }

    try {
      await claimSquare({ contestId: contest.id, squareId: square.id }).unwrap();
    } catch (err) {
      showToast(errorMessage(err, 'Error claiming square'), 'error');
      if (errorStatus(err) === 409) {
        onStale();
      }
    }
  };

  // squares get one stable handler, so a live update only re-renders the squares that changed
  const clickRef = useRef(handleSquareClick);
  useLayoutEffect(() => {
    clickRef.current = handleSquareClick;
  });
  const onSquareClick = useCallback((row: number, col: number) => clickRef.current(row, col), []);

  return (
    <>
      <Paper
        sx={{
          background: game.field,
          border: `1px solid ${game.line}`,
          borderRadius: { xs: '14px', sm: '18px' },
          p: { xs: 0.75, sm: 1, md: 1.5 },
          boxShadow: '0 30px 70px -30px rgba(0, 0, 0, 0.85)',
          width: 'fit-content',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          {/* away team across the top */}
          <Typography sx={{ ...teamLabelSx, mb: { xs: 2.25, sm: 3.75 } }}>
            {contest.awayTeam || 'Away Team'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', pb: { xs: 1.5, sm: 3.5 } }}>
            {/* home team down the side */}
            <Typography
              sx={{
                ...teamLabelSx,
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
                mr: { xs: 2, sm: 3.5 },
              }}
            >
              {contest.homeTeam || 'Home Team'}
            </Typography>

            <Box
              sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pr: { xs: 3.5, sm: 5 } }}
            >
              {contest.yLabels.map((yLabel, row) => (
                <Box key={row} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {contest.xLabels.map((xLabel, col) => {
                    const square = byPosition.get(`${row}-${col}`);
                    return (
                      <Square
                        key={col}
                        rowIndex={row}
                        colIndex={col}
                        squareData={square?.value ?? ''}
                        handleSquareClick={onSquareClick}
                        xLabel={xLabel}
                        yLabel={yLabel}
                        isWinner={winningPositions.has(`${row}-${col}`)}
                        isMine={!!viewer.email && square?.owner === viewer.email}
                        isNewWinner={winnerFlash?.row === row && winnerFlash?.col === col}
                      />
                    );
                  })}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* looked up on every render, so the dialog shows live changes to the square */}
      <SquareDialog
        square={contest.squares.find((s) => s.id === selectedId) ?? null}
        contest={contest}
        viewer={viewer}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
