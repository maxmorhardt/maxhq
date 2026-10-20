import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import ContestsTableSkeleton from './ContestsTableSkeleton';

const theme = createTheme();

function renderSkeleton(props: { title?: string; rowCount?: number } = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <ContestsTableSkeleton {...props} />
    </ThemeProvider>
  );
}

describe('ContestsTableSkeleton', () => {
  it('renders the default title "My Contests"', () => {
    renderSkeleton();
    expect(screen.getByText('My Contests')).toBeInTheDocument();
  });

  it('renders a custom title', () => {
    renderSkeleton({ title: 'Public Contests' });
    expect(screen.getByText('Public Contests')).toBeInTheDocument();
  });
});
