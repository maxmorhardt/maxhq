import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import LeaderboardTable from './LeaderboardTable';
import type { LeaderboardEntry } from '../../types/leaderboard';

const theme = createTheme({ palette: { mode: 'dark' } });

// the podium owns ranks 1-3, so the table starts at 4
const entries: LeaderboardEntry[] = [
  { rank: 4, displayName: 'Max M.', quarterWins: 12, squaresClaimed: 48, quartersPlayed: 48 },
  { rank: 5, displayName: 'Jordan K.', quarterWins: 9, squaresClaimed: 40, quartersPlayed: 30 },
  // played nothing, so there is no rate to show. values stay distinct from every rank on screen
  { rank: 6, displayName: 'Sam R.', quarterWins: 0, squaresClaimed: 11, quartersPlayed: 0 },
];

function renderTable(props: Partial<React.ComponentProps<typeof LeaderboardTable>> = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <LeaderboardTable entries={entries} loading={false} {...props} />
    </ThemeProvider>
  );
}

describe('LeaderboardTable', () => {
  it('renders a row per entry', () => {
    renderTable();

    expect(screen.getByText('Max M.')).toBeInTheDocument();
    expect(screen.getByText('Jordan K.')).toBeInTheDocument();
    expect(screen.getByText('Sam R.')).toBeInTheDocument();
  });

  it('renders the rank of each entry', () => {
    renderTable();

    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('renders wins and squares', () => {
    renderTable();

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('48')).toBeInTheDocument();
  });

  it('computes the win rate from quarters played, not squares claimed', () => {
    renderTable();

    expect(screen.getByText('25%')).toBeInTheDocument();
    // 9 of 30 quarters played is 30%; the old squares-based rate would have shown 23%
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.queryByText('23%')).not.toBeInTheDocument();
  });

  it('shows a dash when the player has played no quarters', () => {
    renderTable();

    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('strips dangerous characters from display names', () => {
    renderTable({
      entries: [
        {
          rank: 1,
          displayName: '<script>x</script>',
          quarterWins: 1,
          squaresClaimed: 1,
          quartersPlayed: 4,
        },
      ],
    });

    expect(screen.queryByText('<script>x</script>')).not.toBeInTheDocument();
    expect(screen.getByText('scriptx/script')).toBeInTheDocument();
  });

  it('renders skeletons while loading', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <LeaderboardTable entries={[]} loading />
      </ThemeProvider>
    );

    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
    expect(screen.queryByText('Rank')).not.toBeInTheDocument();
  });

  it('renders an empty state when there are no entries', () => {
    renderTable({ entries: [] });

    expect(screen.getByText('No winners yet')).toBeInTheDocument();
  });

  it('renders column headers when there are entries', () => {
    renderTable();

    expect(screen.getByText('Player')).toBeInTheDocument();
    expect(screen.getByText('Win Rate')).toBeInTheDocument();
  });

  it('marks the current user', () => {
    renderTable({ highlightKey: '5:Jordan K.' });

    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('does not mark anyone when the user is absent', () => {
    renderTable({ highlightKey: '5:Nobody' });

    expect(screen.queryByText('You')).not.toBeInTheDocument();
  });
});
