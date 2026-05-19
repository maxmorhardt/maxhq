import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { Mail } from '@mui/icons-material';
import FormCard from './FormCard';

const theme = createTheme({ palette: { mode: 'dark' } });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('FormCard', () => {
  it('renders the title', () => {
    render(<FormCard icon={<Mail />} title="Email Us" details="hello@example.com" />, { wrapper });
    expect(screen.getByText('Email Us')).toBeInTheDocument();
  });

  it('renders the details', () => {
    render(<FormCard icon={<Mail />} title="Email Us" details="hello@example.com" />, { wrapper });
    expect(screen.getByText('hello@example.com')).toBeInTheDocument();
  });

  it('renders the icon', () => {
    render(
      <FormCard
        icon={<Mail data-testid="card-icon" />}
        title="Email Us"
        details="hello@example.com"
      />,
      { wrapper }
    );
    expect(screen.getByTestId('card-icon')).toBeInTheDocument();
  });
});
