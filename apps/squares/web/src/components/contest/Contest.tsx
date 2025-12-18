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

  const numRows = currentContest.yLabels.length;
  const numCols = currentContest.xLabels.length;
  const contestMatrix: string[][] = Array.from({ length: numRows }, () => Array(numCols).fill(''));
  currentContest.squares.forEach((square) => {
    if (square.row < numRows && square.col < numCols) {
      contestMatrix[square.row][square.col] = square.value;
    }
  });

  const handleSquareClick = async (row: number, col: number) => {
    if (!auth.isAuthenticated) {
      auth.signinRedirect({
        redirect_uri: window.location.href,
      });

      return;
    }

    const square = currentContest.squares.find((s) => s.row === row && s.col === col);
    if (!square) {
      showToast('Square not found', 'error');
      return;
    }

    dispatch(setCurrentSquare(square));
    setOpenEditSquare(true);
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
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
                    xLabel={currentContest.xLabels[colIndex]}
                    yLabel={currentContest.yLabels[rowIndex]}
                  />
                ))}
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>

      <EditSquare open={openEditSquare} onClose={() => setOpenEditSquare(false)} />
    </>
  );
}
