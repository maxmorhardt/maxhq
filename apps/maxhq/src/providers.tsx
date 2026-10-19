import { CssBaseline, ThemeProvider } from '@mui/material';
import type { ReactNode } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import theme, { COLOR_SCHEME_STORAGE_KEY } from './theme';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <HelmetProvider>
      <ThemeProvider theme={theme} defaultMode="dark" modeStorageKey={COLOR_SCHEME_STORAGE_KEY}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </HelmetProvider>
  );
}
