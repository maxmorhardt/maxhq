import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import LandingFeaturesSection from './LandingFeaturesSection';
import type { RefObject } from 'react';

const theme = createTheme({ palette: { mode: 'dark' } });
const animRef = { current: null } as RefObject<HTMLDivElement | null>;

function renderSection(isVisible = false) {
  return render(
    <ThemeProvider theme={theme}>
      <LandingFeaturesSection animRef={animRef} isVisible={isVisible} />
    </ThemeProvider>
  );
}

describe('LandingFeaturesSection', () => {
  it('renders the section heading', () => {
    renderSection();
    expect(screen.getByText('Why Choose Our Platform?')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    renderSection();
    expect(screen.getByText('Built for simplicity, designed for everyone')).toBeInTheDocument();
  });

  it('renders all four feature titles', () => {
    renderSection();
    expect(screen.getByText('Real-time Updates')).toBeInTheDocument();
    expect(screen.getByText('Easy Sharing')).toBeInTheDocument();
    expect(screen.getByText('Mobile Friendly')).toBeInTheDocument();
    expect(screen.getByText('Free to Use')).toBeInTheDocument();
  });

  it('applies visible class when isVisible is true', () => {
    const { container } = renderSection(true);
    expect(container.querySelector('.visible')).toBeInTheDocument();
  });
});
