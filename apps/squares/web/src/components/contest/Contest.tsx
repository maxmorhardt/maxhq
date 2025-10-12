import { Box } from '@mui/material';
import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectCurrentContest } from '../../features/contests/contestSelectors';
import { setCurrentSquare } from '../../features/contests/contestSlice';
import EditSquare from '../square/EditSquare';
import Square from '../square/Square';

export default function Contest() {
  const dispatch = useAppDispatch();
  const contest = useAppSelector(selectCurrentContest);

  const [open, setOpen] = useState(false);

  if (!contest) {
    return;
  }

  const numRows = contest.yLabels.length;
  const numCols = contest.xLabels.length;

  const contestMatrix: string[][] = Array.from({ length: numRows }, () => Array(numCols).fill(''));
  contest.squares.forEach((square) => {
    if (square.row < numRows && square.col < numCols) {
      contestMatrix[square.row][square.col] = square.value;
    }
  });

  const handleSquareClick = async (row: number, col: number) => {
    const square = contest.squares.find((s) => s.row === row && s.col === col);
    if (!square) {
      return;
    }

    dispatch(setCurrentSquare(square));
    setOpen(true);
  };

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* x axis header */}
        <Box
          sx={{
            fontSize: { xs: 12, sm: 14 },
            fontWeight: 'bold',
            color: 'primary.main',
            mb: { xs: 2, sm: 3 },
          }}
        >
          {contest.homeTeam ?? 'Home'}
        </Box>

        <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          {/* y axis header */}
          <Box
            sx={{
              position: 'absolute',
              left: { xs: -55, sm: -65 },
              top: '50%',
              transform: 'translateY(-50%) rotate(-90deg)',
              fontSize: { xs: 12, sm: 14 },
              fontWeight: 'bold',
              color: 'primary.main',
              whiteSpace: 'nowrap',
            }}
          >
            {contest.awayTeam ?? 'Away'}
          </Box>

          {/* squares */}
          <Box>
            {contestMatrix.map((rowData, rowIndex) => (
              <Box key={`${rowIndex}`} sx={{ display: 'flex', alignItems: 'center' }}>
                {rowData.map((squareData, colIndex) => (
                  <Square
                    key={`${rowIndex}-${colIndex}`}
                    rowIndex={rowIndex}
                    colIndex={colIndex}
                    squareData={squareData}
                    handleSquareClick={handleSquareClick}
                    xLabel={contest.xLabels[colIndex]}
                    yLabel={contest.yLabels[rowIndex]}
                  />
                ))}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <EditSquare open={open} onClose={() => setOpen(false)} />
    </>
  );
}
