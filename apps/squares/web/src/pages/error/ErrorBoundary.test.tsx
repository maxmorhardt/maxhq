import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import ErrorBoundary, { ErrorFallback } from './ErrorBoundary';

const mockReload = vi.fn();

beforeEach(() => {
  vi.stubGlobal('location', { ...window.location, reload: mockReload });
});

afterEach(() => {
  mockReload.mockReset();
  vi.unstubAllGlobals();
});

const theme = createTheme({ palette: { mode: 'dark' } });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>
    <MemoryRouter>{children}</MemoryRouter>
  </ThemeProvider>
);

describe('ErrorFallback', () => {
  it('renders the "Oops" heading', () => {
    render(<ErrorFallback />, { wrapper });
    expect(screen.getByText('Oops')).toBeInTheDocument();
  });

  it('renders the "Something Went Wrong" subtitle', () => {
    render(<ErrorFallback />, { wrapper });
    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
  });

  it('renders the Refresh Page button', () => {
    render(<ErrorFallback />, { wrapper });
    expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
  });

  it('renders the Go Home button', () => {
    render(<ErrorFallback />, { wrapper });
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
  });

  it('calls window.location.reload when Refresh is clicked', () => {
    render(<ErrorFallback />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /refresh page/i }));
    expect(mockReload).toHaveBeenCalled();
  });
});

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <ErrorBoundary>
            <span data-testid="child">Normal content</span>
          </ErrorBoundary>
        </MemoryRouter>
      </ThemeProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders ErrorFallback when a child throws', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ThrowingComponent = () => {
      throw new Error('Test error');
    };

    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <ErrorBoundary>
            <ThrowingComponent />
          </ErrorBoundary>
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});
