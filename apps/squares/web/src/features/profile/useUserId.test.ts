import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
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

describe('useUserId', () => {
  it('reads the user id from the profile', () => {
    mockAuth({ email: 'pat@x.com' });
    vi.mocked(useGetMyProfileQuery).mockReturnValue({ data: { userId: 'u_pat' } } as never);

    expect(renderHook(() => useUserId()).result.current).toBe('u_pat');
    expect(useGetMyProfileQuery).toHaveBeenCalledWith(undefined, { skip: false });
  });

  it('skips the profile when signed out', () => {
    mockAuth();
    vi.mocked(useGetMyProfileQuery).mockReturnValue({ data: undefined } as never);

    expect(renderHook(() => useUserId()).result.current).toBeUndefined();
    expect(useGetMyProfileQuery).toHaveBeenCalledWith(undefined, { skip: true });
  });
});
