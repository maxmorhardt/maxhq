import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { handleError } from './handleError';

describe('handleError', () => {
  it('should handle a non-axios error with a message', () => {
    const err = new Error('Something went wrong');
    const result = handleError(err);

    expect(result.code).toBe(0);
    expect(result.message).toBe('Something went wrong');
    expect(result.requestId).toBe('unknown');
    expect(result.timestamp).toBeDefined();
  });

  it('should return "Unknown error occurred" for non-error objects', () => {
    const result = handleError(null);

    expect(result.code).toBe(0);
    expect(result.message).toBe('Unknown error occurred');
  });

  it('should return response data when available (API error)', () => {
    const apiError = {
      code: 422,
      message: 'Validation failed',
      timestamp: '2025-01-01T00:00:00Z',
      requestId: 'req-123',
    };
    const err = new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, {}, {
      data: apiError,
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: {},
      config: { headers: new AxiosHeaders() },
    } as AxiosResponse);

    const result = handleError(err);
    expect(result).toEqual(apiError);
  });

  it('should create error from response status when data is empty', () => {
    const headers = new AxiosHeaders();
    headers.set('x-request-id', 'req-456');
    const err = new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, {}, {
      data: null,
      status: 500,
      statusText: 'Internal Server Error',
      headers,
      config: { headers: new AxiosHeaders() },
    } as AxiosResponse);

    const result = handleError(err);
    expect(result.code).toBe(500);
    expect(result.message).toBe('Request failed with status 500');
    expect(result.requestId).toBe('req-456');
  });

  it('should handle network error (request sent, no response)', () => {
    const err = new AxiosError('Network Error', 'ERR_NETWORK', undefined, {});

    const result = handleError(err);
    expect(result.code).toBe(0);
    expect(result.message).toBe('Network error: Unable to reach the server');
    expect(result.requestId).toBe('');
  });

  it('should handle request setup error (no request object)', () => {
    const err = new AxiosError('Invalid URL');

    const result = handleError(err);
    expect(result.code).toBe(0);
    expect(result.message).toBe('Invalid URL');
    expect(result.requestId).toBe('');
  });
});
