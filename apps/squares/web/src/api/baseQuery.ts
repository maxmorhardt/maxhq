import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
  type FetchBaseQueryMeta,
} from '@reduxjs/toolkit/query/react';
import { getIdToken, signOutLocally } from '../auth/token';
import { apiBaseUrl } from '../utils/environment';
import { toApiError, type ApiError } from './errors';

export const API_BASE_URL = apiBaseUrl();
export const IDEMPOTENCY_HEADER = 'Idempotency-Key';

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 300;
// one budget for the whole call, so retries cannot stack a hung server's wait
const REQUEST_BUDGET_MS = 8_000;
const RETRYABLE_STATUSES = new Set([502, 503, 504]);

const fetchQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: 'include',
  prepareHeaders: async (headers) => {
    const token = await getIdToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

function isRetryable(error: FetchBaseQueryError, meta?: FetchBaseQueryMeta): boolean {
  if (error.status === 'FETCH_ERROR') {
    return true;
  }
  if (error.status === 409) {
    return !!meta?.response?.headers.get('retry-after');
  }
  return typeof error.status === 'number' && RETRYABLE_STATUSES.has(error.status);
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// adds an idempotency key to writes, retries quick transient failures with it, and refreshes the session on a 401
export const baseQuery: BaseQueryFn<string | FetchArgs, unknown, ApiError> = async (
  args,
  api,
  extraOptions
) => {
  const request: FetchArgs = typeof args === 'string' ? { url: args } : args;
  const headers = new Headers(request.headers as HeadersInit | undefined);
  if ((request.method ?? 'GET').toUpperCase() !== 'GET') {
    headers.set(IDEMPOTENCY_HEADER, crypto.randomUUID());
  }

  const deadline = Date.now() + REQUEST_BUDGET_MS;
  let refreshed = false;
  for (let attempt = 1; ; attempt++) {
    const timeout = Math.max(deadline - Date.now(), 1);
    const result = await fetchQuery({ ...request, headers, timeout }, api, extraOptions);
    if (!result.error) {
      return { data: result.data, meta: result.meta };
    }

    if (result.error.status === 401 && !refreshed) {
      refreshed = true;
      if (await getIdToken({ forceRefresh: true })) {
        continue;
      }
    }

    const wait = BASE_DELAY_MS * 2 ** (attempt - 1);
    if (
      attempt < MAX_ATTEMPTS &&
      Date.now() + wait < deadline &&
      isRetryable(result.error, result.meta)
    ) {
      await delay(wait);
      continue;
    }

    // the session is gone for good, so drop it and let the app show the signed-out state
    if (result.error.status === 401) {
      void signOutLocally();
    }

    return { error: toApiError(result.error, result.meta), meta: result.meta };
  }
};
