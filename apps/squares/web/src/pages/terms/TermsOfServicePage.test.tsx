import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import TermsOfServicePage from './TermsOfServicePage';

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const theme = createTheme({ palette: { mode: 'dark' } });

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <TermsOfServicePage />
    </ThemeProvider>
  );
}

describe('TermsOfServicePage', () => {
  it('renders the Terms of Service heading', () => {
    renderPage();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
  });

  it('renders the Acceptance of Terms section', () => {
    renderPage();
    expect(screen.getByText('1. Acceptance of Terms')).toBeInTheDocument();
  });

  it('renders the Description of Service section', () => {
    renderPage();
    expect(screen.getByText('2. Description of Service')).toBeInTheDocument();
  });

  it('renders the User Accounts section', () => {
    renderPage();
    expect(screen.getByText('3. User Accounts')).toBeInTheDocument();
  });

  it('renders the User Conduct section', () => {
    renderPage();
    expect(screen.getByText('4. User Conduct')).toBeInTheDocument();
  });
});
