import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import LandingHowItWorksSection from './LandingHowItWorksSection';
import type { RefObject } from 'react';

const theme = createTheme({ palette: { mode: 'dark' } });
const animRef = { current: null } as RefObject<HTMLDivElement | null>;

function renderSection(isVisible = false) {
  return render(
    <ThemeProvider theme={theme}>
      <LandingHowItWorksSection animRef={animRef} isVisible={isVisible} />
    </ThemeProvider>
  );
}

describe('LandingHowItWorksSection', () => {
  it('renders the "How It Works" heading', () => {
    renderSection();
    expect(screen.getByText('How It Works')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    renderSection();
    expect(screen.getByText(/4 simple steps/i)).toBeInTheDocument();
  });

  it('renders all four step cards', () => {
    renderSection();
    expect(screen.getByText('Fill Out the Squares')).toBeInTheDocument();
    expect(screen.getByText('Randomize Numbers')).toBeInTheDocument();
    expect(screen.getByText('Determine Winners')).toBeInTheDocument();
    expect(screen.getByText('Share & Collaborate')).toBeInTheDocument();
  });

  it('applies visible class when isVisible is true', () => {
    const { container } = renderSection(true);
    expect(container.querySelector('.visible')).toBeInTheDocument();
  });
});
