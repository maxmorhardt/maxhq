import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import api, { setupAxiosInterceptors } from './api';
import type { User } from 'oidc-client-ts';
import type { InternalAxiosRequestConfig } from 'axios';

describe('api', () => {
  it('should be an axios instance with default config', () => {
    expect(api.defaults.headers).toHaveProperty('Content-Type', 'application/json');
    expect(api.defaults.withCredentials).toBe(true);
    expect(api.defaults.timeout).toBe(10000);
  });
});

describe('setupAxiosInterceptors', () => {
  beforeEach(() => {
    api.interceptors.request.clear();
  });

  it('should not add interceptors when user is null', () => {
    const clearSpy = vi.spyOn(api.interceptors.request, 'clear');
    setupAxiosInterceptors(null);
    // clear should not be called when user is null (early return)
    expect(clearSpy).not.toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('should not add interceptors when user is undefined', () => {
    const clearSpy = vi.spyOn(api.interceptors.request, 'clear');
    setupAxiosInterceptors(undefined);
    expect(clearSpy).not.toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('should not add interceptors when user has no access_token', () => {
    const clearSpy = vi.spyOn(api.interceptors.request, 'clear');
    setupAxiosInterceptors({ access_token: '' } as User);
    expect(clearSpy).not.toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('should clear existing interceptors and add auth header', () => {
    const clearSpy = vi.spyOn(api.interceptors.request, 'clear');
    const useSpy = vi.spyOn(api.interceptors.request, 'use');

    setupAxiosInterceptors({ access_token: 'test-token-123' } as User);

    expect(clearSpy).toHaveBeenCalled();
    expect(useSpy).toHaveBeenCalled();

    clearSpy.mockRestore();
    useSpy.mockRestore();
  });

  it('should reject errors in the request interceptor', async () => {
    const useSpy = vi.spyOn(api.interceptors.request, 'use');
    setupAxiosInterceptors({ access_token: 'token' } as User);

    const onRejected = useSpy.mock.calls[0][1] as (error: unknown) => Promise<never>;
    await expect(onRejected(new Error('interceptor error'))).rejects.toThrow('interceptor error');

    useSpy.mockRestore();
  });

  it('should set Authorization header on requests', async () => {
    setupAxiosInterceptors({ access_token: 'my-token' } as User);

    // Get the interceptor fulfillment handler and test it
    const useSpy = vi.spyOn(api.interceptors.request, 'use');
    setupAxiosInterceptors({ access_token: 'my-token' } as User);

    const onFulfilled = useSpy.mock.calls[0][0] as (
      config: InternalAxiosRequestConfig
    ) => InternalAxiosRequestConfig;

    const config = {
      headers: new axios.AxiosHeaders(),
    } as InternalAxiosRequestConfig;

    const result = onFulfilled(config);
    expect(result.headers.Authorization).toBe('Bearer my-token');

    useSpy.mockRestore();
  });
});
