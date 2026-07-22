import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import { WebStorageStateStore } from 'oidc-client-ts';
import type { ReactNode } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import {
  AuthContext,
  type AuthContextProps,
  AuthProvider,
  type AuthProviderProps,
} from 'react-oidc-context';
import { Provider } from 'react-redux';
import { store } from './app/store';
import ErrorBoundary from './pages/error/ErrorBoundary';

const oidcConfig: AuthProviderProps = {
  authority: 'https://login.maxstash.io',
  client_id: 'squares',
  redirect_uri: import.meta.env.PROD
    ? 'https://squares.maxstash.io/auth/callback'
    : 'http://localhost:3000/auth/callback',
  scope: 'openid profile email offline_access',
  userStore:
    typeof window !== 'undefined'
      ? new WebStorageStateStore({ store: window.localStorage })
      : undefined,
};

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
  // mui defaults buttons to uppercase; disable it at the source so normal casing
  // applies app-wide, including the hydration fallback shell which renders
  // outside App's GlobalStyles
  typography: {
    button: {
      textTransform: 'none',
    },
  },
  components: {
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: Number(theme.shape.borderRadius) * 3,
          border: '1px solid rgba(255,255,255,0.1)',
        }),
      },
    },
  },
});

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

  return <AuthProvider {...oidcConfig}>{children}</AuthProvider>;
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
