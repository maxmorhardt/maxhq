import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { mockAuth } from '../../test/auth';
import { useGetMyProfileQuery } from './api';
import { isMe, useMe } from './useMe';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('./api', () => ({ useGetMyProfileQuery: vi.fn() }));

describe('isMe', () => {
  it('matches only the signed-in user id', () => {
    expect(isMe({ userId: 'u_pat' }, 'u_pat')).toBe(true);
    expect(isMe({ userId: 'u_pat' }, 'u_other')).toBe(false);
  });

  it('never matches a missing id', () => {
    expect(isMe({}, undefined)).toBe(false);
    expect(isMe({}, '')).toBe(false);
  });
});

describe('useMe', () => {
  it('reads the user id from the profile', () => {
    mockAuth({ email: 'pat@x.com' });
    vi.mocked(useGetMyProfileQuery).mockReturnValue({
      data: { userId: 'u_pat' },
      isLoading: false,
    } as never);

    const { result } = renderHook(() => useMe());

    expect(result.current).toEqual({ userId: 'u_pat', isLoading: false });
    expect(useGetMyProfileQuery).toHaveBeenCalledWith(undefined, { skip: false });
  });

  it('skips the profile when signed out', () => {
    mockAuth();
    vi.mocked(useGetMyProfileQuery).mockReturnValue({ data: undefined, isLoading: false } as never);

    const { result } = renderHook(() => useMe());

    expect(result.current).toEqual({ userId: undefined, isLoading: false });
    expect(useGetMyProfileQuery).toHaveBeenCalledWith(undefined, { skip: true });
  });
});
