import { alpha, createTheme, type Theme } from '@mui/material/styles';

// build tints from channel vars; theme.palette in a callback is the default scheme only
export const tint = (channel: string, opacity: number) => `rgba(${channel} / ${opacity})`;

export const primaryTint = (theme: Theme, opacity: number) => {
  const primary = (theme.vars ?? theme).palette.primary as { mainChannel: string };

  return tint(primary.mainChannel, opacity);
};

export const secondaryTint = (theme: Theme, opacity: number) => {
  const secondary = (theme.vars ?? theme).palette.secondary as { mainChannel: string };

  return tint(secondary.mainChannel, opacity);
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
export const COLOR_SCHEME_STORAGE_KEY = 'maxhq:theme';

const sans = "'Mona Sans Variable', system-ui, 'Segoe UI', Roboto, sans-serif";
const mono = "'JetBrains Mono Variable', ui-monospace, Consolas, monospace";

export const fonts = { sans, mono };

export const easing = {
  reveal: 'cubic-bezier(0.16, 1, 0.3, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

export const layout = {
  // the header is fixed height so pages can offset against it
  headerHeight: { xs: '60px', lg: '68px' },
  proseWidth: 760,
};

// vertical rhythm shared by every page section; widths come from <Container>
export const pageSection = {
  width: '100%',
  py: { xs: '3.5rem', lg: '5.5rem' },
} as const;

const violet = { light: '#7c3aed', dark: '#a78bfa' };
const azure = { light: '#2563eb', dark: '#60a5fa' };

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'class',
  },
  defaultColorScheme: 'dark',
  colorSchemes: {
    light: {
      palette: {
        primary: { main: violet.light, contrastText: '#ffffff' },
        secondary: { main: azure.light },
        success: { main: '#1a7f37' },
        text: { primary: '#1f2328', secondary: '#59636e' },
        background: { default: '#ffffff', paper: '#f6f8fa' },
        divider: '#d8dee4',
        codeBg: '#eff2f5',
        heroGlow1: alpha(violet.light, 0.22),
        heroGlow2: alpha(azure.light, 0.16),
      },
    },
    dark: {
      palette: {
        primary: { main: violet.dark, contrastText: '#0d0820' },
        secondary: { main: azure.dark },
        success: { main: '#3fb950' },
        text: { primary: '#f0f3f8', secondary: '#9ba6b8' },
        background: { default: '#05070d', paper: '#0c1019' },
        divider: '#1d2433',
        codeBg: '#141a28',
        heroGlow1: alpha('#8b5cf6', 0.5),
        heroGlow2: alpha('#3b82f6', 0.38),
      },
    },
  },
  // lg/xl line up with <Container maxWidth> so pages don't hand-roll widths
  breakpoints: {
    values: { xs: 0, sm: 600, md: 960, lg: 1200, xl: 1400 },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: sans,
    // the root font is 18px, so mui sizes its components against that
    htmlFontSize: 18,
    h1: {
      fontSize: 'clamp(2.6rem, 6.4vw, 5.25rem)',
      lineHeight: 1.02,
      fontWeight: 720,
      letterSpacing: '-0.035em',
      textWrap: 'balance',
    },
    h2: {
      fontSize: 'clamp(2rem, 4.2vw, 3.4rem)',
      lineHeight: 1.06,
      fontWeight: 680,
      letterSpacing: '-0.03em',
      textWrap: 'balance',
    },
    h3: { fontSize: '1.3rem', lineHeight: 1.25, fontWeight: 620, letterSpacing: '-0.015em' },
    // the recurring "page heading" size, so pages just use variant="h4"
    h4: {
      fontSize: 'clamp(2.5rem, 5.5vw, 4rem)',
      lineHeight: 1.04,
      fontWeight: 700,
      letterSpacing: '-0.035em',
      textWrap: 'balance',
    },
    // small uppercase row labels beside content
    overline: {
      fontSize: '0.74rem',
      fontWeight: 620,
      letterSpacing: '0.12em',
      lineHeight: 1.6,
    },
    body1: { lineHeight: 1.65 },
    body2: { lineHeight: 1.6 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '-0.005em' },
  },
  components: {
    MuiCssBaseline: {
      // read through theme.vars so these repaint when the color scheme changes
      styleOverrides: (theme) => {
        const { palette } = theme.vars ?? theme;

        return {
          ':root': {
            font: `18px/145% ${sans}`,
            fontSynthesis: 'none',
            textRendering: 'optimizeLegibility',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            scrollbarColor: `${palette.divider} transparent`,
            '@media (max-width: 1024px)': { fontSize: '16px' },
          },
          html: {
            scrollBehavior: 'smooth',
            '@media (prefers-reduced-motion: reduce)': { scrollBehavior: 'auto' },
          },
          '[id]': { scrollMarginTop: 96 },
          'html, body': {
            margin: 0,
            padding: 0,
            width: '100%',
            backgroundColor: palette.background.default,
            color: palette.text.secondary,
          },
          '::selection': {
            backgroundColor: tint(palette.primary.mainChannel, 0.32),
            color: palette.text.primary,
          },
          'input, textarea': { caretColor: palette.primary.main },
          ':focus-visible': {
            outline: `2px solid ${palette.primary.main}`,
            outlineOffset: 3,
            borderRadius: 6,
          },
          a: { textUnderlineOffset: '0.22em' },
          p: { margin: 0, lineHeight: 1.65 },
          code: {
            fontFamily: mono,
            fontVariantLigatures: 'none',
            fontSize: '0.84em',
            padding: '0.15em 0.4em',
            borderRadius: '6px',
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
        overline: { color: 'var(--mui-palette-text-secondary)', display: 'block' },
      },
    },

    // one elevation language: a hairline border, never a border plus a soft shadow
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: 'none',
          backgroundColor: (theme.vars ?? theme).palette.background.paper,
          transition: theme.transitions.create(['transform', 'border-color', 'background-color'], {
            duration: 220,
            easing: easing.reveal,
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
        root: { padding: 28, '&:last-child': { paddingBottom: 28 } },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 10,
          paddingInline: '1.1rem',
          transition: theme.transitions.create(
            ['background-color', 'border-color', 'color', 'transform'],
            { duration: 180 }
          ),
          '&:active': { transform: 'translateY(1px)' },
        }),
        sizeLarge: { paddingBlock: '0.72rem', paddingInline: '1.5rem', fontSize: '1rem' },
        outlined: ({ theme }) => ({
          borderColor: (theme.vars ?? theme).palette.divider,
          '&:hover': { borderColor: (theme.vars ?? theme).palette.text.secondary },
        }),
      },
    },

    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 520, borderRadius: 8 },
        label: { paddingInline: 10 },
        icon: { marginLeft: 8 },
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
            backgroundColor: tint(palette.background.defaultChannel, 0.74),
            backdropFilter: 'blur(14px) saturate(160%)',
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

    MuiMenu: {
      styleOverrides: {
        paper: ({ theme }) => ({
          marginTop: 6,
          minWidth: 200,
          borderRadius: 12,
          backgroundColor: (theme.vars ?? theme).palette.background.paper,
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
