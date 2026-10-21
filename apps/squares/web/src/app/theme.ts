import { alpha, createTheme } from '@mui/material';

// the game-night palette: a midnight field, the squares blue for play, championship gold for winners
export const game = {
  night: '#060a14',
  field: '#0b1222',
  stand: '#101a2e',
  raised: '#16223a',
  line: '#1e2b47',
  lineStrong: '#2c3d61',
  chalk: '#eef2fa',
  muted: '#93a0ba',
  brand: '#3d9bff',
  brandDeep: '#1976d2',
  go: '#3ddc84',
  gold: '#f7c948',
  goldDeep: '#c99a1c',
  flag: '#ff5d5d',
};

export const fonts = {
  body: "'Barlow', system-ui, 'Segoe UI', Roboto, sans-serif",
  display: "'Barlow Condensed', 'Barlow', system-ui, sans-serif",
};

export const easing = {
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

const display = {
  fontFamily: fonts.display,
  textTransform: 'uppercase',
  letterSpacing: '-0.005em',
  lineHeight: 0.95,
} as const;

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: game.brand, dark: game.brandDeep, contrastText: '#03101f' },
    secondary: { main: game.gold, dark: game.goldDeep, contrastText: '#1d1503' },
    error: { main: game.flag },
    warning: { main: '#ffb547' },
    info: { main: '#5aa9ff' },
    success: { main: game.go, contrastText: '#04150b' },
    background: { default: game.night, paper: game.field },
    text: { primary: game.chalk, secondary: game.muted },
    divider: game.line,
    // older surfaces read grey 900/800 as card and border, so they inherit the field
    grey: {
      900: game.field,
      800: game.line,
      700: game.lineStrong,
      600: '#46587d',
      500: '#7d8aa6',
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: fonts.body,
    h1: { ...display, fontWeight: 800 },
    h2: { ...display, fontWeight: 800 },
    h3: { ...display, fontWeight: 700 },
    h4: { fontFamily: fonts.display, fontWeight: 700, letterSpacing: '0' },
    h5: { fontFamily: fonts.display, fontWeight: 700, letterSpacing: '0.005em' },
    h6: { fontFamily: fonts.display, fontWeight: 700, letterSpacing: '0.01em' },
    overline: { fontFamily: fonts.display, fontWeight: 700, letterSpacing: '0.14em' },
    // turn off mui's uppercase buttons app-wide, including the hydration shell
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': { colorScheme: 'dark', scrollbarColor: `${game.lineStrong} transparent` },
        body: {
          backgroundColor: game.night,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        '::selection': { backgroundColor: alpha(game.brand, 0.32), color: game.chalk },
        'input, textarea': { caretColor: game.brand },
        ':focus-visible': { outline: `2px solid ${game.brand}`, outlineOffset: 2 },
        a: { textUnderlineOffset: '0.2em' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: 'background-color 160ms, border-color 160ms, color 160ms, transform 160ms',
          '&:active': { transform: 'translateY(1px)' },
        },
        sizeLarge: { paddingBlock: 12, paddingInline: 26, fontSize: '1.02rem' },
        outlined: {
          borderColor: game.lineStrong,
          '&:hover': { borderColor: game.muted, backgroundColor: alpha(game.chalk, 0.04) },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { borderRadius: 10 } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600, borderRadius: 8 } },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: game.stand,
          border: `1px solid ${game.line}`,
          boxShadow: '0 18px 40px -12px rgba(0, 0, 0, 0.6)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: game.raised,
          border: `1px solid ${game.lineStrong}`,
          fontSize: '0.78rem',
          fontWeight: 500,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18,
          backgroundColor: game.stand,
          border: `1px solid ${game.line}`,
          boxShadow: '0 30px 80px -24px rgba(0, 0, 0, 0.75)',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: alpha(game.chalk, 0.02),
          '& .MuiOutlinedInput-notchedOutline': { borderColor: game.lineStrong },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: game.muted },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: { root: { borderColor: game.line } },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: game.line } },
    },
    MuiSkeleton: {
      styleOverrides: { root: { backgroundColor: alpha(game.chalk, 0.06) } },
    },
    MuiAccordion: {
      styleOverrides: { root: { backgroundImage: 'none', '&::before': { display: 'none' } } },
    },
  },
});
