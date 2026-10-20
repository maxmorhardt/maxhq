import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { Security } from '@mui/icons-material';
import LearnFeatureCard from './LearnFeatureCard';
import { describe, expect, it } from 'vitest';

const theme = createTheme({ palette: { mode: 'dark' } });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('LearnFeatureCard', () => {
  it('renders the feature title', () => {
    render(
      <LearnFeatureCard
        icon={<Security />}
        title="Secure & Reliable"
        description="Protected with modern security."
      />,
      { wrapper }
    );
    expect(screen.getByText('Secure & Reliable')).toBeInTheDocument();
  });

  it('renders the feature description', () => {
    render(
      <LearnFeatureCard
        icon={<Security />}
        title="Secure & Reliable"
        description="Protected with modern security."
      />,
      { wrapper }
    );
    expect(screen.getByText('Protected with modern security.')).toBeInTheDocument();
  });

  it('renders the icon', () => {
    render(
      <LearnFeatureCard
        icon={<Security data-testid="feature-icon" />}
        title="Secure & Reliable"
        description="Protected with modern security."
      />,
      { wrapper }
    );
    expect(screen.getByTestId('feature-icon')).toBeInTheDocument();
  });
});
