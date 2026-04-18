import { Box, Paper, Typography } from '@mui/material';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import {
  selectCurrentContest,
  selectParticipants,
} from '../../../features/contests/contestSelectors';
import { setCurrentSquare } from '../../../features/contests/contestSlice';
import { updateSquare } from '../../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { useToast } from '../../../hooks/useToast';
import EditSquare from './EditSquare';
import Square from './Square';

interface ContestProps {
  newWinnerSquare?: { row: number; col: number } | null;
}

export default function Contest({ newWinnerSquare }: ContestProps) {
  const auth = useAuth();
  const dispatch = useAppDispatch();
  const currentContest = useAppSelector(selectCurrentContest);
  const participants = useAppSelector(selectParticipants);
  const { showToast } = useToast();
  const [openEditSquare, setOpenEditSquare] = useState(false);

  const currentUsername = auth?.user?.profile?.preferred_username as string | undefined;
  const currentParticipant = participants.find((p) => p.userId === currentUsername);
  const isParticipant = !!currentParticipant;
  const isOwner = currentUsername === currentContest?.owner;
  const isReadOnly = !isParticipant && !isOwner;

  if (
    !currentContest ||
    !currentContest.xLabels ||
    !currentContest.yLabels ||
    !currentContest.squares
  ) {
    return;
  }

  // build 2d matrix for grid display
  const numRows = currentContest.yLabels.length;
  const numCols = currentContest.xLabels.length;
  const contestMatrix: string[][] = Array.from({ length: numRows }, () => Array(numCols).fill(''));
  const ownerMatrix: string[][] = Array.from({ length: numRows }, () => Array(numCols).fill(''));

  // populate matrix with square values and owners
  currentContest.squares.forEach((square) => {
    if (square.row < numRows && square.col < numCols) {
      contestMatrix[square.row][square.col] = square.value;
      ownerMatrix[square.row][square.col] = square.owner;
    }
  });

  // check if a square position is a winner
  const isWinningSquare = (row: number, col: number): boolean => {
    if (!currentContest.quarterResults) {
      return false;
    }

    return (
      currentContest.quarterResults.filter(
        (quarterResult) => quarterResult.winnerRow === row && quarterResult.winnerCol === col
      ).length > 0
    );
  };

  // helper to extract initials from user name
  const getInitials = (name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return '';
    const parts = trimmed.split(/\s+/);
    let initials = '';
    for (let i = 0; i < parts.length && initials.length < 3; i++) {
      initials += parts[i].charAt(0).toUpperCase();
    }
    return initials;
  };

  const handleSquareClick = async (row: number, col: number) => {
    // redirect to login if not authenticated
    if (!auth.isAuthenticated) {
      sessionStorage.setItem('auth_redirect_path', window.location.href);
      auth.signinRedirect();
      return;
    }

    // block non-participants on public contests
    if (isReadOnly) {
      showToast('You need an invite link to participate', 'info');
      return;
    }

    // find square
    const square = currentContest.squares.find(
      (square) => square.row === row && square.col === col
    );

    if (!square) {
      showToast('Square not found', 'error');
      return;
    }

    const isEmpty = !square.value || square.value.trim() === '';
    const isActive = currentContest.status === 'ACTIVE';

    if (isEmpty && isActive) {
      // check square limit for non-owner participants
      const squaresClaimed = currentContest.squares.filter(
        (s) => s.owner === currentUsername
      ).length;
      if (
        currentParticipant &&
        currentParticipant.role !== 'owner' &&
        squaresClaimed >= currentParticipant.maxSquares
      ) {
        showToast('Square limit reached', 'warning');
        return;
      }

      // fill empty square directly with user initials
      const username = auth.user?.profile?.preferred_username;
      const name = auth.user?.profile?.name || '';
      const initials = getInitials(name);

      if (!username || !initials) {
        showToast('Unable to determine your initials', 'error');
        return;
      }

      dispatch(
        updateSquare({
          contestId: currentContest.id,
          squareId: square.id,
          value: initials,
          owner: username,
        })
      );
    } else {
      // open edit dialog for filled squares
      dispatch(setCurrentSquare(square));
      setOpenEditSquare(true);
    }
  };

  return (
    <>
      {/* contest grid container */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* grid paper wrapper */}
        <Paper
          sx={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
            p: { xs: 0.75, sm: 1, md: 1.5 },
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            width: 'fit-content',
          }}
        >
          {/* grid layout */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            {/* x-axis team label (away team) */}
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.7)',
                fontWeight: 600,
                fontSize: { xs: '0.65rem', sm: '0.8rem', md: '0.95rem' },
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                mb: { xs: 1.25, sm: 2.5 },
              }}
            >
              {currentContest.awayTeam || 'Away Team'}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', pb: { xs: 1.5, sm: 3.5 } }}>
              {/* y-axis team label (home team) */}
              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: 600,
                  fontSize: { xs: '0.65rem', sm: '0.8rem', md: '0.95rem' },
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  mr: { xs: 2, sm: 3.5 },
                }}
              >
                {currentContest.homeTeam || 'Home Team'}
              </Typography>

              {/* grid rows */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                  pr: { xs: 3.5, sm: 5 },
                }}
              >
                {/* render each row */}
                {contestMatrix.map((rowData, rowIndex) => (
                  <Box
                    key={`${rowIndex}`}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    {/* render each square in row */}
                    {rowData.map((squareData, colIndex) => (
                      <Square
                        key={`${rowIndex}-${colIndex}`}
                        rowIndex={rowIndex}
                        colIndex={colIndex}
                        squareData={squareData}
                        handleSquareClick={handleSquareClick}
                        xLabel={currentContest.xLabels[colIndex]}
                        yLabel={currentContest.yLabels[rowIndex]}
                        isWinner={isWinningSquare(rowIndex, colIndex)}
                        isMine={
                          !!currentUsername && ownerMatrix[rowIndex][colIndex] === currentUsername
                        }
                        isNewWinner={
                          newWinnerSquare?.row === rowIndex && newWinnerSquare?.col === colIndex
                        }
                      />
                    ))}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* edit square modal */}
      <EditSquare open={openEditSquare} onClose={() => setOpenEditSquare(false)} />
    </>
  );
}
