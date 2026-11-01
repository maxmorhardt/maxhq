import { Box, Typography } from '@mui/material';
import { fonts } from '../../theme';

type Token = 'plain' | 'keyword' | 'func' | 'type' | 'string' | 'comment' | 'punct';

// an editor keeps its own palette in both color schemes, like the hero terminal
const editor = {
  bg: '#0d1117',
  bar: '#010409',
  frame: '#30363d',
  gutter: '#6e7681',
  tabActive: '#0d1117',
  tabText: '#8b949e',
  tabTextActive: '#e6edf3',
  accent: '#a78bfa',
};

const tokenColor: Record<Token, string> = {
  plain: '#e6edf3',
  keyword: '#ff7b72',
  func: '#d2a8ff',
  type: '#79c0ff',
  string: '#a5d6ff',
  comment: '#8b949e',
  punct: '#8b949e',
};

const FIRST_LINE = 93;

// lines 93-106 of apps/squares/realtime/internal/service/stream_service.go
const lines: [string, Token][][] = [
  [
    ['switch', 'keyword'],
    [' {', 'punct'],
  ],
  [
    ['case ', 'keyword'],
    ['lastEventID ', 'plain'],
    ['!= ', 'punct'],
    ['""', 'string'],
    [' && ', 'punct'],
    ['first ', 'plain'],
    ['!= ', 'punct'],
    ['""', 'string'],
    [' &&', 'punct'],
  ],
  [
    ['\tstreams', 'plain'],
    ['.', 'punct'],
    ['CompareIDs', 'func'],
    ['(lastEventID, first) ', 'plain'],
    ['>= ', 'punct'],
    ['0', 'type'],
    [' && ', 'punct'],
    ['streams', 'plain'],
    ['.', 'punct'],
    ['CompareIDs', 'func'],
    ['(lastEventID, last) ', 'plain'],
    ['<= ', 'punct'],
    ['0', 'type'],
    [':', 'punct'],
  ],
  [
    ['\tstart ', 'plain'],
    ['= ', 'punct'],
    ['lastEventID', 'plain'],
  ],
  [
    ['\tmetrics', 'plain'],
    ['.', 'punct'],
    ['RecordStreamResume', 'func'],
    ['(', 'punct'],
    ['true', 'keyword'],
    [')', 'punct'],
  ],
  [
    ['default', 'keyword'],
    [':', 'punct'],
  ],
  [
    ['\tif ', 'keyword'],
    ['lastEventID ', 'plain'],
    ['!= ', 'punct'],
    ['""', 'string'],
    [' {', 'punct'],
  ],
  [
    [
      '\t\t// the gap was trimmed (or the id is from before a redis restart), so start over from a snapshot',
      'comment',
    ],
  ],
  [
    ['\t\tmetrics', 'plain'],
    ['.', 'punct'],
    ['RecordStreamResume', 'func'],
    ['(', 'punct'],
    ['false', 'keyword'],
    [')', 'punct'],
  ],
  [
    ['\t\tlog', 'plain'],
    ['.', 'punct'],
    ['Info', 'func'],
    ['(', 'punct'],
    ['"last event id is no longer replayable, sending a snapshot"', 'string'],
    [', ', 'punct'],
    ['"last_event_id"', 'string'],
    [', lastEventID, ', 'plain'],
    ['"first"', 'string'],
    [', first, ', 'plain'],
    ['"last"', 'string'],
    [', last', 'plain'],
    [')', 'punct'],
  ],
  [['\t}', 'punct']],
  [
    ['\tsub', 'plain'],
    ['.', 'punct'],
    ['Snapshot ', 'plain'],
    ['= ', 'punct'],
    ['snapshot', 'plain'],
  ],
  [
    ['\tsub', 'plain'],
    ['.', 'punct'],
    ['SnapshotID ', 'plain'],
    ['= ', 'punct'],
    ['start', 'plain'],
  ],
  [['}', 'punct']],
];

const tabs = ['stream_service.go', 'hub.go', 'outbox.go'];

export default function CodeWindow() {
  return (
    <Box component="figure" sx={{ m: 0 }}>
      <Box
        sx={{
          overflow: 'hidden',
          borderRadius: '14px',
          border: `1px solid ${editor.frame}`,
          bgcolor: editor.bg,
          boxShadow: '0 30px 80px -40px rgba(1, 4, 9, 0.8)',
        }}
      >
        {/* tab strip */}
        <Box
          sx={{
            display: 'flex',
            overflowX: 'auto',
            bgcolor: editor.bar,
            borderBottom: `1px solid ${editor.frame}`,
            scrollbarWidth: 'none',
          }}
        >
          {tabs.map((tab, i) => (
            <Box
              key={tab}
              component="span"
              sx={{
                flexShrink: 0,
                px: 2,
                py: 1.1,
                fontFamily: fonts.mono,
                fontSize: '0.74rem',
                color: i === 0 ? editor.tabTextActive : editor.tabText,
                bgcolor: i === 0 ? editor.tabActive : 'transparent',
                borderRight: `1px solid ${editor.frame}`,
                boxShadow: i === 0 ? `inset 0 2px 0 ${editor.accent}` : 'none',
              }}
            >
              {tab}
            </Box>
          ))}
        </Box>

        <Box
          component="pre"
          sx={{
            m: 0,
            py: 2.5,
            overflowX: 'auto',
            fontFamily: fonts.mono,
            fontSize: { xs: '0.72rem', md: '0.82rem' },
            lineHeight: 1.75,
            tabSize: 4,
            fontVariantNumeric: 'tabular-nums',
            fontVariantLigatures: 'none',
          }}
        >
          <Box
            component="code"
            sx={{
              display: 'block',
              minWidth: 'max-content',
              p: 0,
              pr: 3,
              borderRadius: 0,
              background: 'none',
              color: 'inherit',
              fontSize: 'inherit',
            }}
          >
            {lines.map((line, i) => (
              <Box key={i} component="span" sx={{ display: 'flex' }}>
                <Box
                  component="span"
                  aria-hidden
                  sx={{
                    flexShrink: 0,
                    width: '4.5ch',
                    mr: 2.5,
                    textAlign: 'right',
                    color: editor.gutter,
                    userSelect: 'none',
                  }}
                >
                  {FIRST_LINE + i}
                </Box>
                <span>
                  {line.length === 0
                    ? ' '
                    : line.map(([text, token], j) => (
                        <Box key={j} component="span" sx={{ color: tokenColor[token] }}>
                          {text}
                        </Box>
                      ))}
                </span>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Typography component="figcaption" variant="body2" sx={{ mt: 2, maxWidth: '62ch' }}>
        From the squares realtime service. A reconnecting viewer picks up from the last event it saw
        while the stream still holds it, and gets a fresh snapshot when it doesn&apos;t, so a
        dropped connection never leaves a board out of date.
      </Typography>
    </Box>
  );
}
