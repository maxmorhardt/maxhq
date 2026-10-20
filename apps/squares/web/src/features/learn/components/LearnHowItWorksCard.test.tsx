import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import LearnHowItWorksCard from './LearnHowItWorksCard';

const theme = createTheme({ palette: { mode: 'dark' } });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('LearnHowItWorksCard', () => {
  it('renders the step number', () => {
    render(
      <LearnHowItWorksCard
        stepNumber={1}
        title="Create the Grid"
        description="Set up a 10x10 grid."
      />,
      { wrapper }
    );
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders the step title', () => {
    render(
      <LearnHowItWorksCard
        stepNumber={2}
        title="Players Choose Squares"
        description="Select squares."
      />,
      { wrapper }
    );
    expect(screen.getByText('Players Choose Squares')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(
      <LearnHowItWorksCard
        stepNumber={3}
        title="Determine Winners"
        description="Based on last digit."
      />,
      { wrapper }
    );
    expect(screen.getByText('Based on last digit.')).toBeInTheDocument();
  });

  it('renders with a custom color prop', () => {
    const { container } = render(
      <LearnHowItWorksCard
        stepNumber={1}
        title="Create the Grid"
        description="Set up a 10x10 grid."
        color="#ffa040"
      />,
      { wrapper }
    );
    expect(container).toBeInTheDocument();
  });
});
