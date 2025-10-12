import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme {
    customBackgrounds: {
      gradients: {
        primary: string;
        secondary: string;
        textGradient: string;
        lightBlue: string;
        black: string;
        pink: string;
        cyan: string;
        mint: string;
      };
      glass: {
        light: string;
        medium: string;
        heavy: string;
        hover: string;
      };
    };
    customShadows: {
      text: string;
      interactive: string;
      elevated: string;
    };
    customTransitions: {
      default: string;
      fast: string;
      slow: string;
    };
    customTransforms: {
      hoverLiftSmall: string;
      hoverLiftMedium: string;
      hoverScale: string;
    };
    customFilters: {
      blurLight: string;
      blurMedium: string;
      blurHeavy: string;
    };
    customBorders: {
      glass: string;
      glassHeavy: string;
    };
    customColors: {
      textMuted: string;
    };
  }

  interface ThemeOptions {
    customBackgrounds?: {
      gradients?: {
        primary?: string;
        secondary?: string;
        textGradient?: string;
        lightBlue?: string;
        black?: string;
        pink?: string;
        cyan?: string;
        mint?: string;
      };
      glass?: {
        light?: string;
        medium?: string;
        heavy?: string;
        hover?: string;
      };
    };
    customShadows?: {
      text?: string;
      interactive?: string;
      elevated?: string;
    };
    customTransitions?: {
      default?: string;
      fast?: string;
      slow?: string;
    };
    customTransforms?: {
      hoverLiftSmall?: string;
      hoverLiftMedium?: string;
      hoverScale?: string;
    };
    customFilters?: {
      blurLight?: string;
      blurMedium?: string;
      blurHeavy?: string;
    };
    customBorders?: {
      glass?: string;
      glassHeavy?: string;
    };
    customColors?: {
      textMuted?: string;
    };
  }
}

export const theme = createTheme({
  palette: {
    mode: 'dark',
  },
  customBackgrounds: {
    gradients: {
      primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      secondary: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
      textGradient: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
      lightBlue: 'linear-gradient(135deg, #1976d2 0%, #1565c0 50%, #0d47a1 100%)',
      black: 'linear-gradient(135deg, #0f1419 0%, #1a2332 100%)',
      pink: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      cyan: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
      mint: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    },
    glass: {
      light: 'rgba(255,255,255,0.05)',
      medium: 'rgba(255,255,255,0.1)',
      heavy: 'rgba(255,255,255,0.15)',
      hover: 'rgba(255,255,255,0.25)',
    },
  },
  customShadows: {
    text: '0 2px 4px rgba(0,0,0,0.3)',
    interactive: '0 12px 40px rgba(0,0,0,0.15)',
    elevated: '0 8px 32px rgba(0,0,0,0.2)',
  },
  customTransitions: {
    default: 'all 0.3s ease',
    fast: 'all 0.2s ease',
    slow: 'all 0.5s ease',
  },
  customTransforms: {
    hoverLiftSmall: 'translateY(-2px)',
    hoverLiftMedium: 'translateY(-4px)',
    hoverScale: 'scale(1.02)',
  },
  customFilters: {
    blurLight: 'blur(5px)',
    blurMedium: 'blur(10px)',
    blurHeavy: 'blur(20px)',
  },
  customBorders: {
    glass: '1px solid rgba(255,255,255,0.15)',
    glassHeavy: '1px solid rgba(255,255,255,0.3)',
  },
  customColors: {
    textMuted: 'rgba(255,255,255,0.8)',
  },
});
