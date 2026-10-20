import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import LandingSectionContainer from './LandingSectionContainer';

const theme = createTheme({ palette: { mode: 'dark' } });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('LandingSectionContainer', () => {
  it('renders its children', () => {
    render(
      <LandingSectionContainer>
        <span data-testid="child">Hello</span>
      </LandingSectionContainer>,
      { wrapper }
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <LandingSectionContainer>
        <span data-testid="child-1">One</span>
        <span data-testid="child-2">Two</span>
      </LandingSectionContainer>,
      { wrapper }
    );
    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
  });
});
