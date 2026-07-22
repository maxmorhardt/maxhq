import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import LeaderboardRankCard from './LeaderboardRankCard';

const theme = createTheme({ palette: { mode: 'dark' } });

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderCard(props: Partial<React.ComponentProps<typeof LeaderboardRankCard>> = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <LeaderboardRankCard rank={null} loading={false} error={false} {...props} />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('LeaderboardRankCard', () => {
  it('shows the rank when the user is ranked', () => {
    renderCard({ rank: { rank: 7, totalRanked: 143, quarterWins: 5, ranked: true } });

    expect(screen.getByText("You're #7 of 143")).toBeInTheDocument();
    expect(screen.getByText('5 quarter wins all-time')).toBeInTheDocument();
  });

  it('uses the singular form for a single win', () => {
    renderCard({ rank: { rank: 40, totalRanked: 143, quarterWins: 1, ranked: true } });

    expect(screen.getByText('1 quarter win all-time')).toBeInTheDocument();
  });

  it('prompts unranked users', () => {
    renderCard({ rank: { rank: 0, totalRanked: 143, quarterWins: 0, ranked: false } });

    expect(screen.getByText("You're not ranked yet")).toBeInTheDocument();
    expect(screen.getByText(/Win a quarter in any contest/)).toBeInTheDocument();
  });

  it('renders a skeleton while loading', () => {
    const { container } = renderCard({ loading: true });

    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('renders nothing on error', () => {
    const { container } = renderCard({ error: true });

    expect(container).toBeEmptyDOMElement();
  });

  it('hides the action when asked', () => {
    renderCard({
      rank: { rank: 7, totalRanked: 143, quarterWins: 5, ranked: true },
      showAction: false,
    });

    expect(screen.queryByRole('button', { name: /view leaderboard/i })).not.toBeInTheDocument();
    expect(screen.getByText("You're #7 of 143")).toBeInTheDocument();
  });

  it('navigates to the leaderboard', () => {
    renderCard({ rank: { rank: 7, totalRanked: 143, quarterWins: 5, ranked: true } });

    fireEvent.click(screen.getByRole('button', { name: /view leaderboard/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/leaderboard');
  });
});
