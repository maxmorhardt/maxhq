import { Box } from '@mui/material';
import { fonts } from '../../theme';

export interface StatusLine {
  text: string;
  kind: 'cmd' | 'out' | 'err';
}

export interface StatusTerminalProps {
  title: string;
  lines: StatusLine[];
}

// a terminal keeps its own palette in both color schemes, like the hero terminal
const term = {
  bg: '#0d1117',
  bar: '#161b22',
  frame: '#30363d',
  cmd: '#e6edf3',
  out: '#8b949e',
  err: '#ff7b72',
  prompt: '#a78bfa',
};

export default function StatusTerminal({ title, lines }: StatusTerminalProps) {
  return (
    <Box
      sx={{
        width: '100%',
        overflow: 'hidden',
        borderRadius: '14px',
        border: `1px solid ${term.frame}`,
        bgcolor: term.bg,
        fontFamily: fonts.mono,
        fontVariantLigatures: 'none',
        boxShadow: '0 30px 80px -40px rgba(1, 4, 9, 0.8)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          px: '0.85rem',
          py: '0.6rem',
          bgcolor: term.bar,
          borderBottom: `1px solid ${term.frame}`,
        }}
      >
        {['#ff5f56', '#ffbd2e', '#27c93f'].map((color) => (
          <Box key={color} sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: color }} />
        ))}
        <Box component="span" sx={{ ml: 1, fontSize: '0.78rem', color: term.out }}>
          {title}
        </Box>
      </Box>

      <Box sx={{ px: 2.5, py: 2.25, fontSize: '0.84rem', lineHeight: 1.7 }}>
        {lines.map((line, i) => (
          // the prerendered 404 knows only its own path, so the client fills in the real one
          <Box
            key={i}
            suppressHydrationWarning
            sx={{ overflowWrap: 'anywhere', color: term[line.kind] }}
          >
            {line.kind === 'cmd' ? (
              <Box component="span" sx={{ mr: 1, color: term.prompt }}>
                ~ $
              </Box>
            ) : null}
            {line.text}
          </Box>
        ))}
        <Box sx={{ color: term.prompt }}>
          ~ ${' '}
          <Box
            component="span"
            sx={{
              display: 'inline-block',
              width: 8,
              height: '1.05em',
              verticalAlign: 'text-bottom',
              bgcolor: term.prompt,
              animation: 'status-blink 1s step-end infinite',
              '@keyframes status-blink': { '50%': { opacity: 0 } },
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
