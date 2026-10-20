import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import AuthLoadingAnimation from './AuthLoadingAnimation';

vi.mock('@mui/material/useMediaQuery', () => ({ default: vi.fn() }));

import useMediaQuery from '@mui/material/useMediaQuery';

const theme = createTheme({ palette: { mode: 'dark' } });

function renderAnimation(props: Parameters<typeof AuthLoadingAnimation>[0] = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <AuthLoadingAnimation {...props} />
    </ThemeProvider>
  );
}

describe('AuthLoadingAnimation', () => {
  beforeEach(() => {
    vi.mocked(useMediaQuery).mockReturnValue(false);
  });

  it('renders the default title and subtitle', () => {
    renderAnimation();
    expect(screen.getByText('Signing you in')).toBeInTheDocument();
    expect(screen.getByText('This will only take a moment')).toBeInTheDocument();
  });

  it('renders custom title and subtitle', () => {
    renderAnimation({ title: 'Welcome back', subtitle: 'Loading your data' });
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByText('Loading your data')).toBeInTheDocument();
  });

  it('renders the exiting state', () => {
    renderAnimation({ exiting: true });
    expect(screen.getByText('Signing you in')).toBeInTheDocument();
  });

  it('renders without animations when reduced motion is preferred', () => {
    vi.mocked(useMediaQuery).mockReturnValue(true);
    renderAnimation();
    expect(screen.getByText('Signing you in')).toBeInTheDocument();
  });

  it('renders the exiting state with reduced motion', () => {
    vi.mocked(useMediaQuery).mockReturnValue(true);
    renderAnimation({ exiting: true });
    expect(screen.getByText('Signing you in')).toBeInTheDocument();
  });
});
