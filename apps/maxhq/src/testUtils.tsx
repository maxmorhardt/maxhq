import { CssBaseline, ThemeProvider } from '@mui/material';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router';
import theme, { COLOR_SCHEME_STORAGE_KEY } from './theme';

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
}

// mirrors the real provider stack so components behave as they do in the app
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', ...options }: RenderWithProvidersOptions = {}
): RenderResult {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <HelmetProvider>
        <ThemeProvider theme={theme} defaultMode="dark" modeStorageKey={COLOR_SCHEME_STORAGE_KEY}>
          <CssBaseline />
          <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </ThemeProvider>
      </HelmetProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
