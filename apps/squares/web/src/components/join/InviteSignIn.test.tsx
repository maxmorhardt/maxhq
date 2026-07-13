import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import InviteSignIn from './InviteSignIn';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));

import { useAuth } from 'react-oidc-context';

const theme = createTheme();

function renderComponent() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <InviteSignIn />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('InviteSignIn', () => {
  const mockSigninRedirect = vi.fn();

  beforeEach(() => {
    mockSigninRedirect.mockClear();
    sessionStorage.clear();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      activeNavigator: undefined,
      settings: { client_id: 'squares', redirect_uri: 'r', scope: 'openid' },
      signinRedirect: mockSigninRedirect,
    } as unknown as ReturnType<typeof useAuth>);
  });

  it("renders the You're Invited heading", () => {
    renderComponent();
    expect(screen.getByText("You're Invited!")).toBeInTheDocument();
  });

  it('renders the feature highlights', () => {
    renderComponent();
    expect(screen.getByText('Claim your squares')).toBeInTheDocument();
    expect(screen.getByText('Win each quarter')).toBeInTheDocument();
    expect(screen.getByText('Compete with friends')).toBeInTheDocument();
  });

  it('shows a single Sign In button that is not a provider button by default', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /sign in to join/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign in with google/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign in with github/i })).not.toBeInTheDocument();
  });

  it('opens the sign-in dialog with provider options when Sign In is clicked', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /sign in to join/i }));
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in with github/i })).toBeInTheDocument();
  });

  it('redirects with the google connector when Google is selected from the dialog', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /sign in to join/i }));
    fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    expect(mockSigninRedirect).toHaveBeenCalledWith({
      extraQueryParams: { connector_id: 'google' },
    });
  });

  it('redirects with the github connector when GitHub is selected from the dialog', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /sign in to join/i }));
    fireEvent.click(screen.getByRole('button', { name: /sign in with github/i }));
    expect(mockSigninRedirect).toHaveBeenCalledWith({
      extraQueryParams: { connector_id: 'github' },
    });
  });
});
