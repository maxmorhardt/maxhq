import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAxiosAuth } from './useAxiosAuth';
import { setupAxiosInterceptors } from '../axios/api';

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../axios/api', () => ({
  default: {},
  setupAxiosInterceptors: vi.fn(),
}));

import { useAuth } from 'react-oidc-context';

describe('useAxiosAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false when user is not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      user: null,
    } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useAxiosAuth());
    expect(result.current).toBe(false);
  });

  it('should return false when user has no access token', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { access_token: '' },
    } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useAxiosAuth());
    expect(result.current).toBe(false);
  });

  it('should setup interceptors and return true when authenticated', () => {
    const mockUser = { access_token: 'valid-token' };
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: mockUser,
    } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useAxiosAuth());

    expect(setupAxiosInterceptors).toHaveBeenCalledWith(mockUser);
    expect(result.current).toBe(true);
  });

  it('should reconfigure when user changes', () => {
    const mockUser1 = { access_token: 'token-1' };
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: mockUser1,
    } as ReturnType<typeof useAuth>);

    const { rerender } = renderHook(() => useAxiosAuth());
    expect(setupAxiosInterceptors).toHaveBeenCalledWith(mockUser1);

    const mockUser2 = { access_token: 'token-2' };
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: mockUser2,
    } as ReturnType<typeof useAuth>);

    rerender();
    expect(setupAxiosInterceptors).toHaveBeenCalledWith(mockUser2);
  });
});
