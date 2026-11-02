import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockAuth } from '../../test/auth';
import { renderWithProviders } from '../../test/render';
import { useStartContest } from './useStartContest';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router', async () => ({
  ...(await vi.importActual<typeof import('react-router')>('react-router')),
  useNavigate: () => navigate,
}));

function Start({ gameId }: { gameId?: string }) {
  const { start, signInDialog } = useStartContest(gameId);
  return (
    <>
      <button type="button" onClick={start}>
        Start
      </button>
      {signInDialog}
    </>
  );
}

describe('useStartContest', () => {
  beforeEach(() => {
    navigate.mockClear();
    sessionStorage.clear();
  });

  it('opens the create form for a signed-in player', () => {
    mockAuth({ email: 'a@x.com' });
    renderWithProviders(<Start gameId="g1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(navigate).toHaveBeenCalledWith('/contests/create?game=g1');
  });

  it('asks a signed-out visitor to sign in and brings them back to the form', () => {
    mockAuth();
    renderWithProviders(<Start />);

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }));

    expect(navigate).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('auth_redirect_path')).toBe('/contests/create');
  });
});
