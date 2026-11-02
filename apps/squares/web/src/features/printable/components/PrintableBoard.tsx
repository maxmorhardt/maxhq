import { Box, Typography } from '@mui/material';

interface Props {
  awayTeam: string;
  homeTeam: string;
}

const ink = '#111';
const line = '#444';
const cells = Array.from({ length: 10 }, (_, i) => i);
const quarters = ['1st quarter', '2nd quarter', '3rd quarter', '4th quarter / OT'];

const labelSx = {
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: ink,
} as const;

const digitCellSx = { aspectRatio: '1', borderBottom: `1px solid ${line}` } as const;

// a paper board: black on white in either color scheme, so it prints the way it looks
export default function PrintableBoard({ awayTeam, homeTeam }: Props) {
  return (
    <Box
      className="squares-print-board"
      sx={{
        maxWidth: 760,
        mx: 'auto',
        bgcolor: '#fff',
        color: ink,
        borderRadius: '6px',
        p: { xs: 1.5, sm: 3 },
        printColorAdjust: 'exact',
      }}
    >
      <Typography sx={{ ...labelSx, mb: 1, textAlign: 'center' }}>
        {awayTeam || '\u00A0'}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 1 }}>
        <Typography
          sx={{
            ...labelSx,
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            textAlign: 'center',
          }}
        >
          {homeTeam || '\u00A0'}
        </Typography>

        <Box
          role="table"
          aria-label="Squares board"
          sx={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(11, minmax(0, 1fr))',
            borderTop: `1px solid ${line}`,
            borderLeft: `1px solid ${line}`,
          }}
        >
          {/* the corner, then the boxes for the away team's digits */}
          <Box role="row" sx={{ display: 'contents' }}>
            <Box sx={{ ...digitCellSx, borderRight: `1px solid ${line}` }} />
            {cells.map((c) => (
              <Box
                key={`top-${c}`}
                role="columnheader"
                sx={{
                  ...digitCellSx,
                  borderRight: `1px solid ${line}`,
                  borderBottom: `2px solid ${ink}`,
                }}
              />
            ))}
          </Box>

          {cells.map((r) => (
            <Box key={`row-${r}`} role="row" sx={{ display: 'contents' }}>
              <Box role="rowheader" sx={{ ...digitCellSx, borderRight: `2px solid ${ink}` }} />
              {cells.map((c) => (
                <Box
                  key={`cell-${r}-${c}`}
                  role="cell"
                  sx={{ ...digitCellSx, borderRight: `1px solid ${line}` }}
                />
              ))}
            </Box>
          ))}
        </Box>
      </Box>

      {/* where the quarter results get written in */}
      <Box
        sx={{
          mt: 2,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' },
          gap: 1,
        }}
      >
        {quarters.map((quarter) => (
          <Box key={quarter} sx={{ border: `1px solid ${line}`, borderRadius: '4px', p: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: ink }}>
              {quarter}
            </Typography>
            <Typography sx={{ mt: 1.25, fontSize: '0.75rem', color: line }}>
              Score ________
            </Typography>
            <Typography sx={{ mt: 1, fontSize: '0.75rem', color: line }}>
              Square ________
            </Typography>
          </Box>
        ))}
      </Box>

      <Typography sx={{ mt: 1.5, textAlign: 'center', fontSize: '0.75rem', color: line }}>
        Play it online with live scores at squares.maxhq.io
      </Typography>
    </Box>
  );
}
