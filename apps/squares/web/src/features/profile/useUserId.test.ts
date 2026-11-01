import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { mockAuth } from '../../test/auth';
import { useGetMyProfileQuery } from './api';
import { isMe, useUserId } from './useUserId';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('./api', () => ({ useGetMyProfileQuery: vi.fn() }));

describe('isMe', () => {
  it('matches only the signed-in user id', () => {
    expect(isMe('u_pat', 'u_pat')).toBe(true);
    expect(isMe('u_pat', 'u_other')).toBe(false);
  });

  it('never matches a missing id', () => {
    expect(isMe(undefined, undefined)).toBe(false);
    expect(isMe(undefined, '')).toBe(false);
  });
});

const at =
  (path: string) =>
  ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, { initialEntries: [path] }, children);

describe('useUserId', () => {
  it('reads the user id from the profile', () => {
    mockAuth({ email: 'pat@x.com' });
    vi.mocked(useGetMyProfileQuery).mockReturnValue({ data: { userId: 'u_pat' } } as never);

    expect(renderHook(() => useUserId(), { wrapper: at('/contests') }).result.current).toBe(
      'u_pat'
    );
    expect(useGetMyProfileQuery).toHaveBeenCalledWith(undefined, { skip: false });
  });

  it('skips the profile when signed out', () => {
    mockAuth();
    vi.mocked(useGetMyProfileQuery).mockReturnValue({ data: undefined } as never);

    expect(renderHook(() => useUserId(), { wrapper: at('/') }).result.current).toBeUndefined();
    expect(useGetMyProfileQuery).toHaveBeenCalledWith(undefined, { skip: true });
  });

  it('waits for the sign-in callback to lift a deleted account block', () => {
    mockAuth({ email: 'pat@x.com' });
    vi.mocked(useGetMyProfileQuery).mockReturnValue({ data: undefined } as never);

    renderHook(() => useUserId(), { wrapper: at('/auth/callback?code=c&state=s') });
    expect(useGetMyProfileQuery).toHaveBeenLastCalledWith(undefined, { skip: true });
  });
});
