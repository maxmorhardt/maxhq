import { alpha, createTheme, type Theme } from '@mui/material/styles';

// build tints from channel vars; theme.palette in a callback is the default scheme only
export const tint = (channel: string, opacity: number) => `rgba(${channel} / ${opacity})`;

export const primaryTint = (theme: Theme, opacity: number) => {
  const primary = (theme.vars ?? theme).palette.primary as { mainChannel: string };

  return tint(primary.mainChannel, opacity);
};

declare module '@mui/material/styles' {
  interface Palette {
    codeBg: string;
    heroGlow1: string;
    heroGlow2: string;
  }

  interface PaletteOptions {
    codeBg?: string;
    heroGlow1?: string;
    heroGlow2?: string;
  }
}

// matches the key the pre-react site used, so a returning visitor keeps their choice
export const COLOR_SCHEME_STORAGE_KEY = 'maxstash:theme';

const sans = "system-ui, 'Segoe UI', Roboto, sans-serif";
const mono = 'ui-monospace, Consolas, monospace';

export const fonts = { sans, mono };

export const easing = {
  reveal: 'cubic-bezier(0.22, 1, 0.36, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

export const layout = {
  // the header is fixed height so pages can offset against it
  headerHeight: { xs: '56px', lg: '64px' },
  proseWidth: 760,
};

// vertical rhythm shared by every page section; widths come from <Container>
export const pageSection = {
  width: '100%',
  py: { xs: '3.5rem', lg: '5rem' },
} as const;

const purple = { light: '#7c3aed', dark: '#a855f7' };

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'class',
  },
  defaultColorScheme: 'dark',
  colorSchemes: {
    light: {
      palette: {
        primary: { main: purple.light, contrastText: '#ffffff' },
        secondary: { main: '#2563eb' },
        text: { primary: '#14161f', secondary: '#4b5262' },
        background: { default: '#f7f7fa', paper: '#ffffff' },
        divider: '#e3e4ea',
        codeBg: '#eeeef4',
        heroGlow1: alpha(purple.light, 0.2),
        heroGlow2: 'rgba(37, 99, 235, 0.16)',
      },
    },
    dark: {
      palette: {
        primary: { main: purple.dark, contrastText: '#0c0d12' },
        secondary: { main: '#3b82f6' },
        text: { primary: '#f3f4f6', secondary: '#b0b6c2' },
        background: { default: '#0c0d12', paper: '#15161f' },
        divider: '#2a2c36',
        codeBg: '#1f2028',
        heroGlow1: alpha(purple.dark, 0.35),
        heroGlow2: 'rgba(59, 130, 246, 0.3)',
      },
    },
  },
  // lg/xl line up with <Container maxWidth> so pages don't hand-roll widths
  breakpoints: {
    values: { xs: 0, sm: 600, md: 960, lg: 1200, xl: 1400 },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: sans,
    // the root font is 18px, so mui sizes its components against that
    htmlFontSize: 18,
    h1: {
      fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
      lineHeight: 1.05,
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    h3: { fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em' },
    // the recurring "page heading" size, so pages just use variant="h4"
    h4: {
      fontSize: 'clamp(2.25rem, 4vw, 3rem)',
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    // small uppercase row/section labels
    overline: {
      fontSize: '0.78rem',
      fontWeight: 600,
      letterSpacing: '0.1em',
      lineHeight: 1.6,
    },
    body1: { lineHeight: 1.6 },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  components: {
    MuiCssBaseline: {
      // read through theme.vars so these repaint when the color scheme changes
      styleOverrides: (theme) => {
        const { palette } = theme.vars ?? theme;

        return {
          ':root': {
            font: `18px/145% ${sans}`,
            letterSpacing: '0.18px',
            fontSynthesis: 'none',
            textRendering: 'optimizeLegibility',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            '@media (max-width: 1024px)': { fontSize: '16px' },
          },
          'html, body': {
            margin: 0,
            padding: 0,
            width: '100%',
            backgroundColor: palette.background.default,
            color: palette.text.secondary,
          },
          p: { margin: 0, lineHeight: 1.6 },
          code: {
            fontFamily: mono,
            fontSize: '0.9em',
            padding: '0.15em 0.4em',
            borderRadius: '4px',
            background: palette.codeBg,
            color: palette.text.primary,
          },
        };
      },
    },

    // headings default to the strong text color without a per-use sx
    MuiTypography: {
      styleOverrides: {
        h1: { color: 'var(--mui-palette-text-primary)' },
        h2: { color: 'var(--mui-palette-text-primary)' },
        h3: { color: 'var(--mui-palette-text-primary)' },
        h4: { color: 'var(--mui-palette-text-primary)' },
        overline: { color: 'var(--mui-palette-primary-main)', display: 'block' },
      },
    },

    // outlined surfaces everywhere, with the hover lift the old cards had
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: 'none',
          transition: theme.transitions.create(['transform', 'border-color', 'box-shadow'], {
            duration: 200,
          }),
        }),
      },
    },
    MuiPaper: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiCardContent: {
      styleOverrides: {
        root: { padding: 24, '&:last-child': { paddingBottom: 24 } },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 999, paddingInline: '1.25rem' },
        sizeLarge: { paddingBlock: '0.7rem', paddingInline: '1.75rem' },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
        // a little more breathing room than mui's default label padding
        label: { paddingInline: 12 },
        icon: { marginLeft: 10 },
      },
    },

    MuiLink: {
      defaultProps: { underline: 'hover', color: 'primary' },
    },

    // the sticky translucent bar, declared once
    MuiAppBar: {
      defaultProps: { position: 'sticky', color: 'transparent', elevation: 0 },
      styleOverrides: {
        root: ({ theme }) => {
          const { palette } = theme.vars ?? theme;

          return {
            backgroundColor: tint(palette.background.defaultChannel, 0.72),
            backdropFilter: 'blur(10px) saturate(180%)',
            border: 'none',
            borderBottom: `1px solid ${palette.divider}`,
            color: palette.text.primary,
          };
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: ({ theme }) => ({
          minHeight: layout.headerHeight.xs,
          [theme.breakpoints.up('md')]: { minHeight: layout.headerHeight.lg },
        }),
      },
    },

    MuiAvatar: {
      styleOverrides: {
        // icon tiles read as rounded squares rather than circles
        rounded: { borderRadius: 12 },
      },
    },
  },
});

export default theme;
