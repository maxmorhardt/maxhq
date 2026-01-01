import { Box, Paper } from '@mui/material';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { selectCurrentContest } from '../../features/contests/contestSelectors';
import { setCurrentSquare } from '../../features/contests/contestSlice';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { useToast } from '../../hooks/useToast';
import EditSquare from '../square/EditSquare';
import Square from '../square/Square';

export default function Contest() {
  const auth = useAuth();
  const dispatch = useAppDispatch();
  const currentContest = useAppSelector(selectCurrentContest);
  const { showToast } = useToast();
  const [openEditSquare, setOpenEditSquare] = useState(false);

  if (!currentContest) {
    return;
  }

  // build 2d matrix for grid display
  const numRows = currentContest.yLabels.length;
  const numCols = currentContest.xLabels.length;
  const contestMatrix: string[][] = Array.from({ length: numRows }, () => Array(numCols).fill(''));

  // populate matrix with square values
  currentContest.squares.forEach((square) => {
    if (square.row < numRows && square.col < numCols) {
      contestMatrix[square.row][square.col] = square.value;
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

  const handleSquareClick = async (row: number, col: number) => {
    // redirect to login if not authenticated
    if (!auth.isAuthenticated) {
      sessionStorage.setItem('auth_redirect_path', window.location.href);
      auth.signinRedirect();

      return;
    }

    // find and open square for editing
    const square = currentContest.squares.find(
      (square) => square.row === row && square.col === col
    );

    if (!square) {
      showToast('Square not found', 'error');
      return;
    }

    dispatch(setCurrentSquare(square));
    setOpenEditSquare(true);
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
            p: { xs: 2.25, sm: 3, md: 4 },
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
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
                  />
                ))}
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>

      {/* edit square modal */}
      <EditSquare open={openEditSquare} onClose={() => setOpenEditSquare(false)} />
    </>
  );
}
