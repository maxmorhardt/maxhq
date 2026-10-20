import { ThemeProvider } from '@mui/material';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { makeStore, type AppStore, type RootState } from '../app/store';
import { theme } from '../app/theme';

interface Options extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Partial<RootState>;
  store?: AppStore;
  route?: string;
}

// renders inside the same providers the app uses, with a fresh store per test
export function renderWithProviders(
  ui: ReactElement,
  { preloadedState, store = makeStore(preloadedState), route = '/', ...options }: Options = {}
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <HelmetProvider>
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
          </ThemeProvider>
        </Provider>
      </HelmetProvider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...options }) };
}
