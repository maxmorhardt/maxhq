import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { Mail } from '@mui/icons-material';
import ContactMethodCard from './ContactMethodCard';

const theme = createTheme({ palette: { mode: 'dark' } });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('ContactMethodCard', () => {
  it('renders the title', () => {
    render(<ContactMethodCard icon={<Mail />} title="Email Us" details="hello@example.com" />, {
      wrapper,
    });
    expect(screen.getByText('Email Us')).toBeInTheDocument();
  });

  it('renders the details', () => {
    render(<ContactMethodCard icon={<Mail />} title="Email Us" details="hello@example.com" />, {
      wrapper,
    });
    expect(screen.getByText('hello@example.com')).toBeInTheDocument();
  });

  it('renders the icon', () => {
    render(
      <ContactMethodCard
        icon={<Mail data-testid="card-icon" />}
        title="Email Us"
        details="hello@example.com"
      />,
      { wrapper }
    );
    expect(screen.getByTestId('card-icon')).toBeInTheDocument();
  });
});
