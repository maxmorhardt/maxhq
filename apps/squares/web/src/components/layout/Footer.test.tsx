import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router';
import Footer from './Footer';

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
    expect(screen.getByText('How to Play')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByText('Privacy')).toBeInTheDocument();
    expect(screen.getByText('Terms')).toBeInTheDocument();
  });

  it('links the site pages with real hrefs crawlers can follow', () => {
    renderFooter();
    expect(screen.getByText('How to Play').closest('a')).toHaveAttribute('href', '/learn-more');
  });

  it('links the legal pages to maxhq.io', () => {
    renderFooter();
    expect(screen.getByText('Privacy').closest('a')).toHaveAttribute(
      'href',
      'https://maxhq.io/privacy-policy'
    );
    expect(screen.getByText('Terms').closest('a')).toHaveAttribute(
      'href',
      'https://maxhq.io/terms-of-service'
    );
  });
});
