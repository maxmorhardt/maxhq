import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import PrivacyPolicyPage from './PrivacyPolicyPage';

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const theme = createTheme({ palette: { mode: 'dark' } });

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <PrivacyPolicyPage />
    </ThemeProvider>
  );
}

describe('PrivacyPolicyPage', () => {
  it('renders the Privacy Policy heading', () => {
    renderPage();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  it('renders the Introduction section', () => {
    renderPage();
    expect(screen.getByText('1. Introduction')).toBeInTheDocument();
  });

  it('renders the Information We Collect section', () => {
    renderPage();
    expect(screen.getByText('2. Information We Collect')).toBeInTheDocument();
  });

  it('renders the Data Security section', () => {
    renderPage();
    expect(screen.getByText('5. Data Security')).toBeInTheDocument();
  });

  it('renders the Your Privacy Rights section', () => {
    renderPage();
    expect(screen.getByText('6. Your Privacy Rights')).toBeInTheDocument();
  });
});
