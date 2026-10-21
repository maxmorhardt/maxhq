import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import LeaderboardPodium from './LeaderboardPodium';
import type { LeaderboardEntry } from '../../../types/leaderboard';

const theme = createTheme({ palette: { mode: 'dark' } });

const entries: LeaderboardEntry[] = [
  { rank: 1, displayName: 'Max M.', quarterWins: 12, squaresClaimed: 48, quartersPlayed: 48 },
  { rank: 2, displayName: 'Jordan K.', quarterWins: 9, squaresClaimed: 40, quartersPlayed: 40 },
  { rank: 3, displayName: 'Sam R.', quarterWins: 1, squaresClaimed: 12, quartersPlayed: 12 },
];

function renderPodium(props: Partial<React.ComponentProps<typeof LeaderboardPodium>> = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <LeaderboardPodium entries={entries} {...props} />
    </ThemeProvider>
  );
}

describe('LeaderboardPodium', () => {
  it('renders the top three players', () => {
    renderPodium();

    expect(screen.getByText('Max M.')).toBeInTheDocument();
    expect(screen.getByText('Jordan K.')).toBeInTheDocument();
    expect(screen.getByText('Sam R.')).toBeInTheDocument();
  });

  it('deals each player a card with their place and stat line', () => {
    renderPodium();

    const cards = within(screen.getByRole('list', { name: 'Top three' })).getAllByRole('listitem');
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent('1st');
    expect(cards[0]).toHaveTextContent('12');
    expect(cards[0]).toHaveTextContent('48');
    expect(cards[0]).toHaveTextContent('25%');
    expect(cards[1]).toHaveTextContent('2nd');
    expect(cards[1]).toHaveTextContent('9');
    expect(cards[2]).toHaveTextContent('3rd');
  });

  it('pluralizes the wins label', () => {
    renderPodium();

    expect(screen.getAllByText('Wins')).toHaveLength(2);
    expect(screen.getByText('Win')).toBeInTheDocument();
  });

  it('renders nothing when there are no entries', () => {
    const { container } = renderPodium({ entries: [] });

    expect(container).toBeEmptyDOMElement();
  });

  it('marks the current user', () => {
    renderPodium({ highlightKey: '2:Jordan K.' });

    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('does not mark anyone when the user is absent', () => {
    renderPodium({ highlightKey: '2:Nobody' });

    expect(screen.queryByText('You')).not.toBeInTheDocument();
  });

  it('strips dangerous characters from display names', () => {
    renderPodium({
      entries: [
        { rank: 1, displayName: '<script>', quarterWins: 1, squaresClaimed: 1, quartersPlayed: 4 },
      ],
    });

    expect(screen.queryByText('<script>')).not.toBeInTheDocument();
    expect(screen.getByText('script')).toBeInTheDocument();
  });

  it('falls back to third-place styling for an unexpected rank', () => {
    renderPodium({
      entries: [
        { rank: 9, displayName: 'Riley P.', quarterWins: 2, squaresClaimed: 8, quartersPlayed: 8 },
      ],
    });

    expect(screen.getByText('Riley P.')).toBeInTheDocument();
  });
});
