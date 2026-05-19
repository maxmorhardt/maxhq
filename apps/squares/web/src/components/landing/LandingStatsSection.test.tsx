import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { statsReducer } from '../../features/stats/statsSlice';
import LandingStatsSection from './LandingStatsSection';

vi.mock('../../service/statsService', () => ({
  getStats: vi.fn().mockResolvedValue({
    contestsCreatedToday: 12,
    squaresClaimedToday: 84,
    totalActiveContests: 5,
  }),
}));

const theme = createTheme({ palette: { mode: 'dark' } });

function createTestStore() {
  return configureStore({ reducer: { stats: statsReducer } });
}

function renderSection() {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <LandingStatsSection />
      </ThemeProvider>
    </Provider>
  );
}

describe('LandingStatsSection', () => {
  let observeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    observeMock = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = observeMock;
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

  it('renders the "By the Numbers" heading', async () => {
    await act(async () => {
      renderSection();
    });
    expect(screen.getByText('By the Numbers')).toBeInTheDocument();
  });

  it('renders stat labels', async () => {
    await act(async () => {
      renderSection();
    });
    expect(screen.getByText('Contests Created Today')).toBeInTheDocument();
    expect(screen.getByText('Squares Claimed Today')).toBeInTheDocument();
  });

  it('shows stat values after data loads', async () => {
    await act(async () => {
      renderSection();
    });
    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument();
    });
  });
});
