import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { statsReducer } from '../../features/stats/statsSlice';
import LandingPage from './LandingPage';

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  HelmetProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: false, signinRedirect: vi.fn() }),
}));

vi.mock('../../hooks/useScrollAnimation', () => ({
  useScrollAnimation: () => ({ ref: { current: null }, isVisible: false }),
}));

vi.mock('../../components/landing/LandingStatsSection', () => ({
  default: () => <div data-testid="stats-section" />,
}));

vi.mock('../../service/statsService', () => ({
  getStats: vi.fn().mockResolvedValue({
    contestsCreatedToday: 3,
    squaresClaimedToday: 30,
    totalActiveContests: 2,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

const theme = createTheme({ palette: { mode: 'dark' } });

function createTestStore() {
  return configureStore({ reducer: { stats: statsReducer } });
}

function renderPage() {
  return render(
    <Provider store={createTestStore()}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
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

  it('renders the How It Works section', () => {
    renderPage();
    expect(screen.getByText('How It Works')).toBeInTheDocument();
  });

  it('renders the Features section', () => {
    renderPage();
    expect(screen.getByText('Why Choose Our Platform?')).toBeInTheDocument();
  });

  it('renders the CTA section', () => {
    renderPage();
    expect(screen.getByText('Ready to Get Started?')).toBeInTheDocument();
  });

  it('renders the stats section', () => {
    renderPage();
    expect(screen.getByTestId('stats-section')).toBeInTheDocument();
  });
});
