import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import LearnMorePage from './LearnMorePage';

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  HelmetProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../hooks/useScrollAnimation', () => ({
  useScrollAnimation: vi.fn(() => ({ ref: { current: null }, isVisible: false })),
}));

import { useScrollAnimation } from '../../hooks/useScrollAnimation';

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

  it('renders the "Learn More" heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /learn more/i })).toBeInTheDocument();
  });

  it('renders the "How Squares Work" section', () => {
    renderPage();
    expect(screen.getByText('How Squares Work')).toBeInTheDocument();
  });

  it('renders all three how-it-works steps', () => {
    renderPage();
    expect(screen.getByText('Create the Grid')).toBeInTheDocument();
    expect(screen.getByText('Players Choose Squares')).toBeInTheDocument();
    expect(screen.getByText('Determine Winners')).toBeInTheDocument();
  });

  it('renders the Features section', () => {
    renderPage();
    expect(screen.getByText('Squares Made Easy')).toBeInTheDocument();
    expect(screen.getByText('Social & Collaborative')).toBeInTheDocument();
  });

  it('renders FAQ questions', () => {
    renderPage();
    expect(screen.getByText('What is Squares?')).toBeInTheDocument();
    expect(screen.getByText('How do I create a contest?')).toBeInTheDocument();
  });

  it('renders the page description text', () => {
    renderPage();
    expect(screen.getByText(/Discover everything you need to know/i)).toBeInTheDocument();
  });

  it('applies visible CSS class when isVisible is true', () => {
    vi.mocked(useScrollAnimation).mockReturnValue({ ref: { current: null }, isVisible: true });
    renderPage();
    expect(screen.getByText('Learn More')).toBeInTheDocument();
  });
});
