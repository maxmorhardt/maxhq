import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router';
import SignInDialog from './SignInDialog';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));

import { useAuth } from 'react-oidc-context';

const theme = createTheme();

function renderDialog(props?: { open?: boolean; onClose?: () => void; redirectPath?: string }) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <SignInDialog
          open={props?.open ?? true}
          onClose={props?.onClose ?? vi.fn()}
          redirectPath={props?.redirectPath}
        />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('SignInDialog', () => {
  const mockSigninRedirect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.mocked(useAuth).mockReturnValue({
      signinRedirect: mockSigninRedirect,
    } as unknown as ReturnType<typeof useAuth>);
  });

  it('renders both provider buttons and the terms caption', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in with github/i })).toBeInTheDocument();
    expect(screen.getByText(/terms of service/i)).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByRole('button', { name: /sign in with google/i })).not.toBeInTheDocument();
  });

  it('redirects with the google connector and closes', () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    expect(onClose).toHaveBeenCalled();
    expect(mockSigninRedirect).toHaveBeenCalledWith({
      extraQueryParams: { connector_id: 'google' },
    });
  });

  it('lists google, then microsoft, then github', () => {
    renderDialog();
    expect(
      screen.getAllByRole('button', { name: /^sign in with/i }).map((b) => b.textContent)
    ).toEqual(['Sign in with Google', 'Sign in with Microsoft', 'Sign in with GitHub']);
  });

  it('redirects with the microsoft connector', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /sign in with microsoft/i }));
    expect(mockSigninRedirect).toHaveBeenCalledWith({
      extraQueryParams: { connector_id: 'microsoft' },
    });
  });

  it('redirects with the github connector', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /sign in with github/i }));
    expect(mockSigninRedirect).toHaveBeenCalledWith({
      extraQueryParams: { connector_id: 'github' },
    });
  });

  it('stores the redirect path when provided', () => {
    renderDialog({ redirectPath: '/contests/create' });
    fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    expect(sessionStorage.getItem('auth_redirect_path')).toBe('/contests/create');
  });
});
