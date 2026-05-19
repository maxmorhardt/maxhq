import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import InviteSignIn from './InviteSignIn';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../utils/oidcHelpers', () => ({
  createOidcStateForRegistration: vi.fn().mockResolvedValue({ state: 's', codeChallenge: 'c' }),
}));

import { useAuth } from 'react-oidc-context';
import { createOidcStateForRegistration } from '../../utils/oidcHelpers';

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
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      activeNavigator: undefined,
      settings: { client_id: 'c', redirect_uri: 'r', scope: 'openid' },
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

  it('renders Sign In and Register buttons', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  it('calls signinRedirect when Sign In button is clicked', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(mockSigninRedirect).toHaveBeenCalled();
  });

  it('calls createOidcStateForRegistration when Register button is clicked', async () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    await waitFor(() =>
      expect(createOidcStateForRegistration).toHaveBeenCalledWith(
        expect.objectContaining({ client_id: 'c' })
      )
    );
  });
});
