import { CssBaseline, ThemeProvider } from '@mui/material';
import type { ReactNode } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { AuthContext, type AuthContextProps, AuthProvider } from 'react-oidc-context';
import { Provider } from 'react-redux';
import { getUserManager } from '../auth/userManager';
import ErrorBoundary from '../components/feedback/ErrorBoundary';
import { store } from './store';
import { theme } from './theme';

// prerendered pages render signed out; the real session loads in the browser
const serverAuthStub = {
  isLoading: true,
  isAuthenticated: false,
  user: undefined,
  error: undefined,
  activeNavigator: undefined,
} as unknown as AuthContextProps;

function AuthWrapper({ children }: { children: ReactNode }) {
  if (typeof window === 'undefined') {
    return <AuthContext.Provider value={serverAuthStub}>{children}</AuthContext.Provider>;
  }

  return <AuthProvider userManager={getUserManager()}>{children}</AuthProvider>;
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <HelmetProvider>
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <AuthWrapper>
            <CssBaseline />
            <ErrorBoundary>{children}</ErrorBoundary>
          </AuthWrapper>
        </ThemeProvider>
      </Provider>
    </HelmetProvider>
  );
}
