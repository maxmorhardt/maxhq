import { Box, Typography } from '@mui/material';
import { fonts } from '../../theme';

type Token = 'plain' | 'keyword' | 'func' | 'type' | 'comment' | 'punct';

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
  comment: '#8b949e',
  punct: '#8b949e',
};

const FIRST_LINE = 360;

// lines 360-370 of apps/squares/contests/internal/service/contest_service.go
const lines: [string, Token][][] = [
  [['// the repository re-checks status, ownership, and the limit atomically', 'comment']],
  [
    ['var ', 'keyword'],
    ['claimedSquare ', 'plain'],
    ['*', 'punct'],
    ['model', 'plain'],
    ['.', 'punct'],
    ['Square', 'type'],
  ],
  [
    ['err ', 'plain'],
    ['= ', 'punct'],
    ['s', 'plain'],
    ['.', 'punct'],
    ['tx', 'plain'],
    ['.', 'punct'],
    ['Do', 'func'],
    ['(ctx, ', 'punct'],
    ['func', 'keyword'],
    ['(ctx ', 'punct'],
    ['context', 'plain'],
    ['.', 'punct'],
    ['Context', 'type'],
    [') ', 'punct'],
    ['error', 'type'],
    [' {', 'punct'],
  ],
  [
    ['\tvar ', 'keyword'],
    ['claimErr ', 'plain'],
    ['error', 'type'],
  ],
  [
    ['\tclaimedSquare, claimErr ', 'plain'],
    ['= ', 'punct'],
    ['s', 'plain'],
    ['.', 'punct'],
    ['repo', 'plain'],
    ['.', 'punct'],
    ['ClaimSquare', 'func'],
    ['(ctx, square, profile.DefaultInitials, user, claims.Name)', 'plain'],
  ],
  [
    ['\tif ', 'keyword'],
    ['claimErr ', 'plain'],
    ['!= ', 'punct'],
    ['nil', 'keyword'],
    [' {', 'punct'],
  ],
  [
    ['\t\treturn ', 'keyword'],
    ['claimErr', 'plain'],
  ],
  [['\t}', 'punct']],
  [],
  [
    ['\treturn ', 'keyword'],
    ['s', 'plain'],
    ['.', 'punct'],
    ['events', 'plain'],
    ['.', 'punct'],
    ['PublishSquareUpdate', 'func'],
    ['(ctx, contest.ID, user, claimedSquare)', 'plain'],
  ],
  [['})', 'punct']],
];

const tabs = ['contest_service.go', 'outbox.go', 'Square.tsx'];

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
        From the squares contests service. A claimed square and the event announcing it commit in
        one transaction, so the live stream never shows a square the database doesn&apos;t have.
      </Typography>
    </Box>
  );
}
