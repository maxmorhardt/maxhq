import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import LandingCTASection from './LandingCTASection';
import type { RefObject } from 'react';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: false, signinRedirect: vi.fn() }),
}));

vi.mock('../LandingCreateContestButton', () => ({
  default: () => <button>Create a Contest</button>,
}));

const theme = createTheme({ palette: { mode: 'dark' } });
const animRef = { current: null } as RefObject<HTMLDivElement | null>;

function renderSection(isVisible = false) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <LandingCTASection animRef={animRef} isVisible={isVisible} />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('LandingCTASection', () => {
  it('renders the heading', () => {
    renderSection();
    expect(screen.getByText('Ready to Get Started?')).toBeInTheDocument();
  });

  it('renders all three badges', () => {
    renderSection();
    expect(screen.getByText('No credit card required')).toBeInTheDocument();
    expect(screen.getByText('Setup in under 2 minutes')).toBeInTheDocument();
    expect(screen.getByText('Works on all devices')).toBeInTheDocument();
  });

  it('renders the create contest button', () => {
    renderSection();
    expect(screen.getByRole('button', { name: /create a contest/i })).toBeInTheDocument();
  });

  it('applies visible class when isVisible is true', () => {
    const { container } = renderSection(true);
    expect(container.querySelector('.visible')).toBeInTheDocument();
  });
});
