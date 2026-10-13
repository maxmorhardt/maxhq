import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import api from './api';
import { IDEMPOTENCY_HEADER, idempotentRequest } from './idempotency';

function axiosError(status?: number, headers: Record<string, string> = {}) {
  const config = { headers: new AxiosHeaders() };
  const response = status
    ? { status, statusText: '', headers, config, data: { code: status, message: 'x' } }
    : undefined;
  return new AxiosError('failed', 'ERR', config, {}, response);
}

describe('idempotentRequest', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('sends one key per call and returns the response', async () => {
    const request = vi.spyOn(api, 'request').mockResolvedValue({ data: { id: 'c1' } });

    const res = await idempotentRequest<{ id: string }>({
      method: 'PUT',
      url: '/contests',
      data: {},
    });

    expect(res.data.id).toBe('c1');
    const headers = request.mock.calls[0][0].headers as Record<string, string>;
    expect(headers[IDEMPOTENCY_HEADER]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('retries transient failures with the same key', async () => {
    const request = vi
      .spyOn(api, 'request')
      .mockRejectedValueOnce(axiosError())
      .mockRejectedValueOnce(axiosError(503))
      .mockResolvedValue({ data: 'ok' });

    const res = await idempotentRequest<string>({
      method: 'POST',
      url: '/x',
      headers: { 'If-Match': '"2"' },
    });

    expect(res.data).toBe('ok');
    const keys = request.mock.calls.map(
      (c) => (c[0].headers as Record<string, string>)[IDEMPOTENCY_HEADER]
    );
    expect(new Set(keys).size).toBe(1);
    expect((request.mock.calls[2][0].headers as Record<string, string>)['If-Match']).toBe('"2"');
  });

  it('waits out a request that is still in progress', async () => {
    const request = vi
      .spyOn(api, 'request')
      .mockRejectedValueOnce(axiosError(409, { 'retry-after': '1' }))
      .mockResolvedValue({ data: 'done' });

    await expect(idempotentRequest({ method: 'POST', url: '/x' })).resolves.toEqual({
      data: 'done',
    });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does not retry client errors or plain conflicts', async () => {
    const request = vi.spyOn(api, 'request').mockRejectedValue(axiosError(409));

    await expect(idempotentRequest({ method: 'POST', url: '/x' })).rejects.toBeInstanceOf(
      AxiosError
    );
    expect(request).toHaveBeenCalledOnce();

    request.mockReset().mockRejectedValue(new Error('not axios'));
    await expect(idempotentRequest({ method: 'POST', url: '/x' })).rejects.toThrow('not axios');
    expect(request).toHaveBeenCalledOnce();
  });

  it('gives up after three attempts', async () => {
    const request = vi.spyOn(api, 'request').mockRejectedValue(axiosError(502));

    await expect(idempotentRequest({ method: 'POST', url: '/x' })).rejects.toBeInstanceOf(
      AxiosError
    );
    expect(request).toHaveBeenCalledTimes(3);
  });
});
