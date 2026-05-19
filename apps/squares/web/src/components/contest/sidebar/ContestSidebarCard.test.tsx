import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import ContestSidebarCard from './ContestSidebarCard';

const theme = createTheme();

describe('ContestSidebarCard', () => {
  it('renders the title', () => {
    render(
      <ThemeProvider theme={theme}>
        <ContestSidebarCard icon={<span>icon</span>} title="Test Card">
          <p>Content</p>
        </ContestSidebarCard>
      </ThemeProvider>
    );
    expect(screen.getByText('Test Card')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <ThemeProvider theme={theme}>
        <ContestSidebarCard icon={<span>icon</span>} title="Card">
          <p>Child Content</p>
        </ContestSidebarCard>
      </ThemeProvider>
    );
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('renders the icon', () => {
    render(
      <ThemeProvider theme={theme}>
        <ContestSidebarCard icon={<span data-testid="my-icon">icon</span>} title="Card">
          <p>Content</p>
        </ContestSidebarCard>
      </ThemeProvider>
    );
    expect(screen.getByTestId('my-icon')).toBeInTheDocument();
  });
});
