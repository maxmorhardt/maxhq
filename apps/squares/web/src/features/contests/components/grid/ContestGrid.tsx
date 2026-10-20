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
  fontSize: 'clamp(0.75rem, 2.3cqw, 1.15rem)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  lineHeight: 1,
} as const;

const squareGap = 'clamp(2px, 0.9cqw, 8px)';

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
          width: '100%',
          // squares, labels, and gaps scale with the board's width
          containerType: 'inline-size',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          {/* away team across the top */}
          <Typography sx={{ ...teamLabelSx, mb: 'clamp(16px, 4.5cqw, 34px)' }}>
            {contest.awayTeam || 'Away Team'}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              pb: 'clamp(10px, 3cqw, 28px)',
            }}
          >
            {/* home team down the side */}
            <Typography
              sx={{
                ...teamLabelSx,
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
                mr: 'clamp(24px, 5.5cqw, 36px)',
              }}
            >
              {contest.homeTeam || 'Home Team'}
            </Typography>

            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: squareGap,
                pr: 'clamp(24px, 6cqw, 44px)',
              }}
            >
              {contest.yLabels.map((yLabel, row) => (
                <Box key={row} sx={{ display: 'flex', alignItems: 'center', gap: squareGap }}>
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
