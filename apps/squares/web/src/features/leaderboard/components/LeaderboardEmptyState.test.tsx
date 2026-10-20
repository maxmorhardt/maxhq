import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import LeaderboardEmptyState from './LeaderboardEmptyState';

const theme = createTheme({ palette: { mode: 'dark' } });

describe('LeaderboardEmptyState', () => {
  it('explains that nobody has won yet', () => {
    render(
      <ThemeProvider theme={theme}>
        <LeaderboardEmptyState />
      </ThemeProvider>
    );

    expect(screen.getByText('No winners yet')).toBeInTheDocument();
    expect(screen.getByText(/top players will show up here/i)).toBeInTheDocument();
  });
});
