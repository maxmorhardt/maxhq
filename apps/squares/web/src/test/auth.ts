import { vi } from 'vitest';
import { useAuth, type AuthContextProps } from 'react-oidc-context';

// tests mock react-oidc-context with vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }))
export function mockAuth(overrides: Partial<AuthContextProps> & { email?: string } = {}) {
  const { email, ...rest } = overrides;
  const signedIn = email !== undefined;
  const auth = {
    isLoading: false,
    isAuthenticated: signedIn,
    activeNavigator: undefined,
    error: undefined,
    user: signedIn ? { profile: { email }, expired: false } : null,
    removeUser: vi.fn().mockResolvedValue(undefined),
    signinRedirect: vi.fn().mockResolvedValue(undefined),
    ...rest,
  } as unknown as AuthContextProps;
  vi.mocked(useAuth).mockReturnValue(auth);
  return auth;
}

// a mutation hook's tuple whose trigger resolves or rejects like unwrap() would
export function mockMutation<T>(
  result: T | { error: unknown },
  state: Record<string, unknown> = {}
) {
  const trigger = vi.fn(() => ({
    unwrap: () =>
      result && typeof result === 'object' && 'error' in result
        ? Promise.reject((result as { error: unknown }).error)
        : Promise.resolve(result as T),
  }));
  return [
    trigger,
    { isLoading: false, isError: false, error: undefined, reset: vi.fn(), ...state },
  ] as const;
}
