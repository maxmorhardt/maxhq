import { Box, Button, useTheme } from '@mui/material';
import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectCurrentContest } from '../../features/contests/contestSelectors';
import { setCurrentSquare } from '../../features/contests/contestThunks';
import EditSquare from './EditSquare';

export default function SquaresContest() {
  const theme = useTheme();
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

    await dispatch(setCurrentSquare(square));
    setOpen(true);
  };

  return (
    <>
      <Box>
        {/* x-axis */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          {/* empty box to align labels */}
          <Box sx={{ marginRight: { xs: 1.5, sm: 1.5, md: 1.75 } }} />
          {/* labels */}
          {contest.xLabels.map((label, i) => (
            <Box
              key={i}
              sx={{
                fontWeight: 'bold',
                fontSize: { xs: 10, sm: 12, md: 14 },
                margin: { xs: 0.1, sm: 0.3, md: 0.3 },
                minWidth: { xs: 30, sm: 45, md: 60 },
              }}
            >
              {label === -1 ? '-' : label}
            </Box>
          ))}
        </Box>

        {/* y-axis */}
        {contestMatrix.map((rowData, rowIndex) => (
          <Box
            key={rowIndex}
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {/* labels */}
            <Box
              sx={{
                mr: 1,
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: { xs: 10, sm: 12, md: 14 },
              }}
            >
              {contest.yLabels[rowIndex] === -1 ? '-' : contest.yLabels[rowIndex]}
            </Box>

            {/* square data */}
            {rowData.map((squareData, colIndex) => (
              <Button
                key={`${rowIndex}-${colIndex}`}
                onClick={() => handleSquareClick(rowIndex, colIndex)}
                sx={{
                  bgcolor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  padding: 0,
                  margin: { xs: 0.1, sm: 0.3, md: 0.3 },
                  minWidth: { xs: 30, sm: 45, md: 60 },
                  minHeight: { xs: 30, sm: 45, md: 60 },
                  fontSize: { xs: 10, sm: 12, md: 14 },
                }}
              >
                {squareData}
              </Button>
            ))}
          </Box>
        ))}
      </Box>

      <EditSquare open={open} onClose={() => setOpen(false)} />
    </>
  );
}
