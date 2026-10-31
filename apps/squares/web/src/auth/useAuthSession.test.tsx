import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeStore } from '../app/store';
import { mockAuth } from '../test/auth';
import { useAuthSession } from './useAuthSession';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
const refreshSession = vi.hoisted(() => vi.fn().mockResolvedValue(null));
vi.mock('./token', () => ({ refreshSession }));
const setFaroUser = vi.hoisted(() => vi.fn());
vi.mock('../utils/faro', () => ({ setFaroUser }));

function setup() {
  const store = makeStore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return { store, ...renderHook(() => useAuthSession(), { wrapper }) };
}

describe('useAuthSession', () => {
  beforeEach(() => {
    refreshSession.mockClear();
    setFaroUser.mockClear();
  });

  it('renews a stored session once on load', () => {
    mockAuth({ user: { refresh_token: 'r' } as never });
    const { rerender } = setup();
    rerender();
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it('leaves an active session alone', () => {
    mockAuth({ email: 'a@x.com' });
    setup();
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('reports a failed sign-in redirect', () => {
    mockAuth({ activeNavigator: 'signinRedirect', isLoading: true });
    const { store, rerender } = setup();
    mockAuth({ error: new Error('denied') as never });
    rerender();
    expect(store.getState().toast.messages[0]).toMatchObject({
      message: 'Authentication failed. Please try again',
      severity: 'error',
    });
  });

  it('clears cached data on sign-out', () => {
    mockAuth({ email: 'a@x.com' });
    const { store, rerender } = setup();
    const dispatch = vi.spyOn(store, 'dispatch');
    mockAuth();
    rerender();
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'api/resetApiState' }));
  });

  it('renews a stale session when the tab comes back', () => {
    mockAuth({
      email: 'a@x.com',
      user: { expired: true, refresh_token: 'r', profile: {} } as never,
    });
    setup();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(refreshSession).toHaveBeenCalled();
  });

  it('tells faro who is signed in, and when they sign out', () => {
    mockAuth({ email: 'a@x.com' });
    const { rerender } = setup();
    expect(setFaroUser).toHaveBeenLastCalledWith({ email: 'a@x.com' });

    mockAuth();
    rerender();
    expect(setFaroUser).toHaveBeenLastCalledWith(undefined);
  });
});
