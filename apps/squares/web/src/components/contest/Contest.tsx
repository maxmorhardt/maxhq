import { Box, Paper } from '@mui/material';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { selectCurrentContest } from '../../features/contests/contestSelectors';
import { setCurrentSquare } from '../../features/contests/contestSlice';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import EditSquare from '../square/EditSquare';
import Square from '../square/Square';
import { useToast } from '../../hooks/useToast';
import type { Contest } from '../../types/contest';

interface ContestProps {
  immutable?: boolean;
}

export default function Contest({ immutable = false }: ContestProps) {
  const auth = useAuth();
  const dispatch = useAppDispatch();
  const currentContest = useAppSelector(selectCurrentContest);
  const { showToast } = useToast();

  const [open, setOpen] = useState(false);

  if (!currentContest) {
    return;
  }

  const contest = currentContest;

  const numRows = contest.yLabels.length;
  const numCols = contest.xLabels.length;

  const contestMatrix: string[][] = Array.from({ length: numRows }, () => Array(numCols).fill(''));
  contest.squares.forEach((square) => {
    if (square.row < numRows && square.col < numCols) {
      contestMatrix[square.row][square.col] = square.value;
    }
  });

  const handleSquareClick = async (row: number, col: number) => {
    if (immutable) {
      return;
    }

    if (!auth.isAuthenticated) {
      auth.signinRedirect({
        redirect_uri: window.location.href,
      });

      return;
    }

    const square = contest.squares.find((s) => s.row === row && s.col === col);
    if (!square) {
      showToast('Square not found', 'error');
      return;
    }

    dispatch(setCurrentSquare(square));
    setOpen(true);
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: 1,
        }}
      >
        {!currentContest && (
          <Box
            sx={{
              mb: 2,
              p: 2,
              background: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              borderRadius: 2,
              color: '#ffc107',
              textAlign: 'center',
            }}
          >
            Contest not available - Displaying preview mode
          </Box>
        )}
        <Paper
          sx={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
            p: { xs: 2.25, sm: 3, md: 4 },
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          {/* squares grid */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            {contestMatrix.map((rowData, rowIndex) => (
              <Box
                key={`${rowIndex}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                {rowData.map((squareData, colIndex) => (
                  <Square
                    key={`${rowIndex}-${colIndex}`}
                    rowIndex={rowIndex}
                    colIndex={colIndex}
                    squareData={squareData}
                    handleSquareClick={handleSquareClick}
                    xLabel={contest.xLabels[colIndex]}
                    yLabel={contest.yLabels[rowIndex]}
                    immutable={immutable}
                  />
                ))}
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>

      <EditSquare open={open} onClose={() => setOpen(false)} />
    </>
  );
}
