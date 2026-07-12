import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import Footer from './Footer';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const theme = createTheme();

function renderFooter() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('Footer', () => {
  it('renders the copyright text with the current year', () => {
    renderFooter();
    const year = new Date().getFullYear();
    expect(screen.getByText(`© ${year} Squares`)).toBeInTheDocument();
  });

  it('renders all navigation links', () => {
    renderFooter();
    expect(screen.getByText('Learn More')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByText('Privacy')).toBeInTheDocument();
    expect(screen.getByText('Terms')).toBeInTheDocument();
  });

  it('navigates to the correct path when a link is clicked', () => {
    renderFooter();
    fireEvent.click(screen.getByText('Learn More'));
    expect(mockNavigate).toHaveBeenCalledWith('/learn-more');
  });

  it('links the legal pages to maxstash.io', () => {
    renderFooter();
    expect(screen.getByText('Privacy').closest('a')).toHaveAttribute(
      'href',
      'https://maxstash.io/privacy-policy'
    );
    expect(screen.getByText('Terms').closest('a')).toHaveAttribute(
      'href',
      'https://maxstash.io/terms-of-service'
    );
  });
});
