import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router';
import { mockAuth } from '../test/auth';
import LearnMorePage from './LearnMorePage';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  HelmetProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../hooks/useScrollAnimation', () => ({
  useScrollAnimation: vi.fn(() => ({ ref: { current: null }, isVisible: false })),
}));

import { useScrollAnimation } from '../hooks/useScrollAnimation';

const theme = createTheme({ palette: { mode: 'dark' } });

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <LearnMorePage />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('LearnMorePage', () => {
  beforeEach(() => {
    mockAuth();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
        root = null;
        rootMargin = '';
        thresholds: number[] = [];
        takeRecords = vi.fn();
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('names the page for what people search', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: 'How to Play Football Squares' })
    ).toBeInTheDocument();
  });

  it('walks through all four steps', () => {
    renderPage();
    expect(screen.getByText('How Football Squares Works')).toBeInTheDocument();
    for (const step of [
      'Set up the board',
      'Friends claim squares',
      'Numbers are drawn at kickoff',
      'The score picks each square',
    ]) {
      expect(screen.getByText(step)).toBeInTheDocument();
    }
  });

  it('says plainly that no money is involved', () => {
    renderPage();
    expect(screen.getByText('Free to play, just for fun.')).toBeInTheDocument();
    expect(screen.getByText('Does Squares involve money or prizes?')).toBeInTheDocument();
    expect(screen.getByText('Free, with no money involved')).toBeInTheDocument();
  });

  it('offers a way to start a board from the top and the bottom', () => {
    renderPage();
    expect(screen.getAllByRole('button', { name: /^create a contest$/i })).toHaveLength(2);
    expect(screen.getByRole('link', { name: /this week's games/i })).toHaveAttribute(
      'href',
      '/games'
    );
  });

  it('keeps the bottom pitch to signed-out visitors', () => {
    mockAuth({ email: 'a@x.com' });
    renderPage();
    expect(screen.getAllByRole('button', { name: /^create a contest$/i })).toHaveLength(1);
  });

  it('reveals its sections once they scroll into view', () => {
    vi.mocked(useScrollAnimation).mockReturnValue({ ref: { current: null }, isVisible: true });
    const { container } = renderPage();
    expect(container.querySelector('[data-visible]')).toBeInTheDocument();
  });
});
