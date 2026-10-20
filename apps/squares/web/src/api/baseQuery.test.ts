import { configureStore } from '@reduxjs/toolkit';
import { createApi } from '@reduxjs/toolkit/query/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const token = vi.hoisted(() => ({ getIdToken: vi.fn(), signOutLocally: vi.fn() }));
vi.mock('../auth/token', () => token);

import { baseQuery, IDEMPOTENCY_HEADER } from './baseQuery';

const testApi = createApi({
  baseQuery,
  endpoints: (build) => ({
    read: build.query<unknown, void>({ query: () => '/thing' }),
    write: build.mutation<unknown, void>({
      query: () => ({ url: '/thing', method: 'POST', body: {} }),
    }),
  }),
});

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

function setup() {
  const store = configureStore({
    reducer: { [testApi.reducerPath]: testApi.reducer },
    middleware: (m) => m().concat(testApi.middleware),
  });
  return {
    read: () => store.dispatch(testApi.endpoints.read.initiate(undefined, { forceRefetch: true })),
    write: () => store.dispatch(testApi.endpoints.write.initiate()),
  };
}

const fetchMock = vi.fn();
const sentHeaders = (call: number) => (fetchMock.mock.calls[call][0] as Request).headers;

describe('baseQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    token.getIdToken.mockReset().mockResolvedValue('tok');
    token.signOutLocally.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the bearer token and no idempotency key on reads', async () => {
    fetchMock.mockResolvedValue(json(200, { ok: true }));
    const result = await setup().read();
    expect(result.data).toEqual({ ok: true });
    expect(sentHeaders(0).get('Authorization')).toBe('Bearer tok');
    expect(sentHeaders(0).get(IDEMPOTENCY_HEADER)).toBeNull();
  });

  it('retries a write with the same idempotency key', async () => {
    fetchMock.mockResolvedValueOnce(json(503, {})).mockResolvedValueOnce(json(200, { ok: true }));
    const result = await setup().write();
    expect('data' in result && result.data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentHeaders(0).get(IDEMPOTENCY_HEADER)).toBeTruthy();
    expect(sentHeaders(1).get(IDEMPOTENCY_HEADER)).toBe(sentHeaders(0).get(IDEMPOTENCY_HEADER));
  });

  it('retries a conflict only when the server says when', async () => {
    fetchMock
      .mockResolvedValueOnce(json(409, {}, { 'Retry-After': '1' }))
      .mockResolvedValueOnce(json(409, { message: 'taken' }));
    const result = await setup().write();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect('error' in result && result.error).toMatchObject({ status: 409, message: 'taken' });
  });

  it('stops after three attempts', async () => {
    fetchMock.mockImplementation(async () => json(502, {}));
    const result = await setup().read();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.error).toMatchObject({ status: 502 });
  });

  it('refreshes the session once on a 401 and retries', async () => {
    token.getIdToken
      .mockResolvedValueOnce('stale')
      .mockResolvedValueOnce('fresh')
      .mockResolvedValue('fresh');
    fetchMock.mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(200, { ok: true }));
    const result = await setup().read();
    expect(result.data).toEqual({ ok: true });
    expect(token.getIdToken).toHaveBeenCalledWith({ forceRefresh: true });
    expect(sentHeaders(1).get('Authorization')).toBe('Bearer fresh');
  });

  it('signs out when the session cannot be refreshed', async () => {
    token.getIdToken.mockImplementation(async (opts?: { forceRefresh?: boolean }) =>
      opts?.forceRefresh ? null : 'stale'
    );
    fetchMock.mockImplementation(async () => json(401, { message: 'expired' }));
    const result = await setup().read();
    expect(result.error).toMatchObject({ status: 401 });
    expect(token.signOutLocally).toHaveBeenCalled();
  });

  it('does not retry a client error', async () => {
    fetchMock.mockResolvedValue(json(400, { message: 'bad' }));
    const result = await setup().read();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.error).toEqual({ status: 400, message: 'bad', requestId: undefined });
  });
});
