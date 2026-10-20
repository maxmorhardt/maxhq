import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import LeaderboardTableSkeleton from './LeaderboardTableSkeleton';

const theme = createTheme({ palette: { mode: 'dark' } });

function renderSkeleton() {
  return render(
    <ThemeProvider theme={theme}>
      <LeaderboardTableSkeleton />
    </ThemeProvider>
  );
}

describe('LeaderboardTableSkeleton', () => {
  it('renders four placeholder rows', () => {
    const { container } = renderSkeleton();

    expect(container.querySelectorAll('.MuiPaper-root')).toHaveLength(4);
  });

  it('renders a placeholder for every column of a row', () => {
    const { container } = renderSkeleton();

    // rank, avatar, name, wins, squares, win rate
    const firstRow = container.querySelector('.MuiPaper-root');
    expect(firstRow?.querySelectorAll('.MuiSkeleton-root')).toHaveLength(6);
  });

  it('fades each row more than the one above it', () => {
    const { container } = renderSkeleton();

    const rows = Array.from(container.querySelectorAll<HTMLElement>('.MuiPaper-root'));
    const opacities = rows.map((row) => Number(getComputedStyle(row).opacity));

    expect(opacities[0]).toBe(1);
    opacities.slice(1).forEach((opacity, i) => {
      expect(opacity).toBeLessThan(opacities[i]);
    });
    expect(opacities[opacities.length - 1]).toBeGreaterThan(0);
  });
});
