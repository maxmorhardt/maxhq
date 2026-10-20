import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import LandingStatsSection from './LandingStatsSection';

const stats = vi.hoisted(() => ({ useGetSiteStatsQuery: vi.fn() }));
vi.mock('../api', () => stats);

const theme = createTheme({ palette: { mode: 'dark' } });

function renderSection() {
  return render(
    <ThemeProvider theme={theme}>
      <LandingStatsSection />
    </ThemeProvider>
  );
}

describe('LandingStatsSection', () => {
  let observeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    stats.useGetSiteStatsQuery.mockReturnValue({
      data: { contestsCreatedToday: 12, squaresClaimedToday: 84, totalActiveContests: 5 },
      isLoading: false,
    });
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

  it('shows placeholders while stats load', async () => {
    stats.useGetSiteStatsQuery.mockReturnValue({ data: undefined, isLoading: true });
    await act(async () => {
      renderSection();
    });
    expect(screen.queryByText('12')).not.toBeInTheDocument();
  });
});
