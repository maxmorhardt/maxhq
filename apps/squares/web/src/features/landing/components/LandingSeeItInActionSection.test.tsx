import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import LandingSeeItInActionSection from './LandingSeeItInActionSection';
import type { RefObject } from 'react';

const theme = createTheme({ palette: { mode: 'dark' } });
const animRef = { current: null } as RefObject<HTMLDivElement | null>;

function renderSection(isVisible = false) {
  return render(
    <ThemeProvider theme={theme}>
      <LandingSeeItInActionSection animRef={animRef} isVisible={isVisible} />
    </ThemeProvider>
  );
}

describe('LandingSeeItInActionSection', () => {
  it('renders the section heading', () => {
    renderSection();
    expect(screen.getByText('See It In Action')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    renderSection();
    expect(screen.getByText(/winners are determined each quarter/i)).toBeInTheDocument();
  });

  it('renders all three step cards', () => {
    renderSection();
    expect(screen.getByText(/Game Reaches End of Quarter/i)).toBeInTheDocument();
    expect(screen.getByText(/Look at the Final Score/i)).toBeInTheDocument();
    expect(screen.getByText(/Determine the Winner/i)).toBeInTheDocument();
  });

  it('applies visible class when isVisible is true', () => {
    const { container } = renderSection(true);
    expect(container.querySelector('.visible')).toBeInTheDocument();
  });
});
