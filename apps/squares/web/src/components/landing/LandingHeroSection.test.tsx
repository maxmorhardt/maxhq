import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import LandingHeroSection from './LandingHeroSection';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: false, signinRedirect: vi.fn() }),
}));

const theme = createTheme({ palette: { mode: 'dark' } });

function renderHero() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <LandingHeroSection />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('LandingHeroSection', () => {
  it('renders the main "Squares" heading', () => {
    renderHero();
    expect(screen.getByRole('heading', { name: /squares/i, level: 1 })).toBeInTheDocument();
  });

  it('renders the tagline text', () => {
    renderHero();
    expect(screen.getByText(/ultimate football squares/i)).toBeInTheDocument();
  });

  it('renders the "Learn More" button', () => {
    renderHero();
    expect(screen.getByRole('button', { name: /learn more/i })).toBeInTheDocument();
  });

  it('navigates to /learn-more when "Learn More" is clicked', () => {
    renderHero();
    fireEvent.click(screen.getByRole('button', { name: /learn more/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/learn-more');
  });

  it('renders the "Create a Contest" button', () => {
    renderHero();
    expect(screen.getByRole('button', { name: /create a contest/i })).toBeInTheDocument();
  });
});
