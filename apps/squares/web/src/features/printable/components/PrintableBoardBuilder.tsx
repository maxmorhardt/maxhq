import { Print } from '@mui/icons-material';
import { Box, Button, GlobalStyles, TextField } from '@mui/material';
import { useState } from 'react';
import { stripDangerousChars } from '../../../utils/sanitize';
import PrintableBoard from './PrintableBoard';

// only the board prints; the site around it drops away
const printStyles = (
  <GlobalStyles
    styles={{
      '@media print': {
        '@page': { size: 'portrait', margin: '0.4in' },
        'html, body': { colorScheme: 'light', background: '#fff !important' },
        'body *': { background: 'transparent !important', minHeight: '0 !important' },
        'header, footer, .squares-no-print': { display: 'none !important' },
        '.squares-print-page': { padding: '0 !important', maxWidth: 'none !important' },
        '.squares-print-board': {
          padding: '0 !important',
          maxWidth: 'none !important',
          background: '#fff !important',
        },
      },
    }}
  />
);

export default function PrintableBoardBuilder() {
  const [awayTeam, setAwayTeam] = useState('');
  const [homeTeam, setHomeTeam] = useState('');

  return (
    <Box>
      {printStyles}

      {/* the options, which never print */}
      <Box
        className="squares-no-print"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) minmax(0, 1fr) auto' },
          gap: 2,
          alignItems: 'center',
          mb: 3,
        }}
      >
        <TextField
          label="Away team"
          value={awayTeam}
          onChange={(e) => setAwayTeam(stripDangerousChars(e.target.value))}
          slotProps={{ htmlInput: { maxLength: 24 } }}
          size="small"
        />
        <TextField
          label="Home team"
          value={homeTeam}
          onChange={(e) => setHomeTeam(stripDangerousChars(e.target.value))}
          slotProps={{ htmlInput: { maxLength: 24 } }}
          size="small"
        />
        <Button variant="contained" startIcon={<Print />} onClick={() => window.print()}>
          Print Board
        </Button>
      </Box>

      <PrintableBoard awayTeam={awayTeam} homeTeam={homeTeam} />
    </Box>
  );
}
