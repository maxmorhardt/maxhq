import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router';
import LandingPage from './LandingPage';

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  HelmetProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: false, signinRedirect: vi.fn() }),
}));

vi.mock('../hooks/useScrollAnimation', () => ({
  useScrollAnimation: () => ({ ref: { current: null }, isVisible: false }),
}));

vi.mock('../features/landing/components/LandingScoreboard', () => ({
  default: () => <div data-testid="stats-section" />,
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: () => vi.fn() };
});

const theme = createTheme({ palette: { mode: 'dark' } });

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('LandingPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
        root = null;
        rootMargin = '';
        thresholds: number[] = [];
        takeRecords = vi.fn();
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the hero heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /squares/i, level: 1 })).toBeInTheDocument();
  });

  it('renders the how-it-works story', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'How a pool plays out' })).toBeInTheDocument();
  });

  it('renders the features section', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Built for game day' })).toBeInTheDocument();
  });

  it('renders the closing call to action', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /kickoff is coming/i })).toBeInTheDocument();
  });

  it('renders the stats section', () => {
    renderPage();
    expect(screen.getByTestId('stats-section')).toBeInTheDocument();
  });
});
