import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { GridOn } from '@mui/icons-material';
import LandingHowItWorksCard from './LandingHowItWorksCard';

const theme = createTheme({ palette: { mode: 'dark' } });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('LandingHowItWorksCard', () => {
  it('renders the card title', () => {
    render(
      <LandingHowItWorksCard
        icon={GridOn}
        title="Fill Out the Squares"
        description="Participants choose squares on a 10x10 grid."
        backgroundColor="primary.main"
      />,
      { wrapper }
    );
    expect(screen.getByText('Fill Out the Squares')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(
      <LandingHowItWorksCard
        icon={GridOn}
        title="Fill Out the Squares"
        description="Participants choose squares on a 10x10 grid."
        backgroundColor="primary.main"
      />,
      { wrapper }
    );
    expect(screen.getByText('Participants choose squares on a 10x10 grid.')).toBeInTheDocument();
  });

  it('renders the icon', () => {
    const { container } = render(
      <LandingHowItWorksCard
        icon={GridOn}
        title="Fill Out the Squares"
        description="Grid description."
        backgroundColor="primary.main"
      />,
      { wrapper }
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
