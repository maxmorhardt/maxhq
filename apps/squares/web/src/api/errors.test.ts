import { describe, expect, it } from 'vitest';
import { errorMessage, errorStatus, isApiError, toApiError } from './errors';

const meta = (headers: Record<string, string> = {}) =>
  ({ request: new Request('http://x'), response: new Response(null, { headers }) }) as never;

describe('toApiError', () => {
  it('uses the server error body', () => {
    expect(
      toApiError({ status: 409, data: { message: 'Square taken', requestId: 'r-1' } }, meta())
    ).toEqual({ status: 409, message: 'Square taken', requestId: 'r-1' });
  });

  it('describes a status without a body and keeps the request id header', () => {
    expect(toApiError({ status: 502, data: null }, meta({ 'x-request-id': 'r-2' }))).toEqual({
      status: 502,
      message: 'Request failed with status 502',
      requestId: 'r-2',
    });
  });

  it('maps network, timeout, parsing, and custom failures', () => {
    expect(toApiError({ status: 'FETCH_ERROR', error: 'x' }).message).toMatch(/Network error/);
    expect(toApiError({ status: 'TIMEOUT_ERROR', error: 'x' }).message).toMatch(/too long/);
    expect(
      toApiError({ status: 'PARSING_ERROR', originalStatus: 500, data: '<html>', error: 'x' })
    ).toMatchObject({ status: 500 });
    expect(toApiError({ status: 'CUSTOM_ERROR', error: 'boom' })).toEqual({
      status: 0,
      message: 'boom',
    });
  });
});

describe('error helpers', () => {
  it('reads the status and message of an ApiError', () => {
    const error = { status: 404, message: 'Not found' };
    expect(isApiError(error)).toBe(true);
    expect(errorStatus(error)).toBe(404);
    expect(errorMessage(error)).toBe('Not found');
  });

  it('falls back for anything else', () => {
    expect(isApiError(new Error('x'))).toBe(false);
    expect(errorStatus('x')).toBeUndefined();
    expect(errorMessage(undefined, 'Fallback')).toBe('Fallback');
  });
});
