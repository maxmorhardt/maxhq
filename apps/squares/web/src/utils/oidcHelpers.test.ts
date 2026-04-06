import { describe, it, expect, beforeEach } from 'vitest';
import type { AuthContextProps } from 'react-oidc-context';
import { createOidcStateForRegistration } from './oidcHelpers';

describe('createOidcStateForRegistration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockSettings: AuthContextProps['settings'] = {
    redirect_uri: 'http://localhost:3000/callback',
    scope: 'openid profile email',
    authority: 'https://auth.example.com',
    client_id: 'test-client',
  };

  it('should return state and codeChallenge strings', async () => {
    const result = await createOidcStateForRegistration(mockSettings);

    expect(result.state).toBeDefined();
    expect(typeof result.state).toBe('string');
    expect(result.state.length).toBeGreaterThan(0);

    expect(result.codeChallenge).toBeDefined();
    expect(typeof result.codeChallenge).toBe('string');
    expect(result.codeChallenge.length).toBeGreaterThan(0);
  });

  it('should store OIDC state in localStorage', async () => {
    const result = await createOidcStateForRegistration(mockSettings);

    const stored = localStorage.getItem(`oidc.${result.state}`);
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.id).toBe(result.state);
    expect(parsed.request_type).toBe('si:r');
    expect(parsed.redirect_uri).toBe('http://localhost:3000/callback');
    expect(parsed.scope).toBe('openid profile email');
    expect(parsed.authority).toBe('https://auth.example.com');
    expect(parsed.client_id).toBe('test-client');
    expect(parsed.code_verifier).toBeDefined();
    expect(parsed.created).toBeDefined();
  });

  it('should produce unique state values on subsequent calls', async () => {
    const result1 = await createOidcStateForRegistration(mockSettings);
    const result2 = await createOidcStateForRegistration(mockSettings);

    expect(result1.state).not.toBe(result2.state);
  });

  it('should use defaults when settings are missing optional fields', async () => {
    const minimalSettings = {} as AuthContextProps['settings'];

    const result = await createOidcStateForRegistration(minimalSettings);
    const stored = JSON.parse(localStorage.getItem(`oidc.${result.state}`)!);

    expect(stored.redirect_uri).toBe('');
    expect(stored.scope).toBe('openid profile email offline_access');
    expect(stored.authority).toBe('');
    expect(stored.client_id).toBe('');
  });

  it('should produce a base64url-encoded code challenge', async () => {
    const result = await createOidcStateForRegistration(mockSettings);

    // base64url should not contain +, /, or =
    expect(result.codeChallenge).not.toMatch(/[+/=]/);
  });
});
