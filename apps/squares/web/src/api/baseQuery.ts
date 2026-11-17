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
// how long one attempt may wait on the server, and the whole call with its retries
const ATTEMPT_TIMEOUT_MS = 4_000;
const REQUEST_BUDGET_MS = 8_000;
// a retry with less time left than this would only turn the real error into a timeout
const MIN_ATTEMPT_MS = 1_000;
const RETRYABLE_STATUSES = new Set([502, 503, 504]);

const fetchQuery = fetchBaseQuery({ baseUrl: API_BASE_URL, credentials: 'include' });

function isRetryable(error: FetchBaseQueryError, meta?: FetchBaseQueryMeta): boolean {
  if (error.status === 'FETCH_ERROR' || error.status === 'TIMEOUT_ERROR') {
    return true;
  }
  if (error.status === 409) {
    return !!meta?.response?.headers.get('retry-after');
  }
  return typeof error.status === 'number' && RETRYABLE_STATUSES.has(error.status);
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// adds an idempotency key to writes, retries transient failures with it, and refreshes the session on a 401
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

  // the budget is the server's alone: it starts after the token and again after a refresh
  let token = await getIdToken();
  let deadline = performance.now() + REQUEST_BUDGET_MS;
  let refreshed = false;
  for (let attempt = 1; ; attempt++) {
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const timeout = Math.max(Math.min(ATTEMPT_TIMEOUT_MS, deadline - performance.now()), 1);
    const result = await fetchQuery({ ...request, headers, timeout }, api, extraOptions);
    if (!result.error) {
      return { data: result.data, meta: result.meta };
    }

    if (result.error.status === 401 && !refreshed) {
      refreshed = true;
      token = await getIdToken({ forceRefresh: true });
      if (token) {
        deadline = performance.now() + REQUEST_BUDGET_MS;
        continue;
      }
    }

    const wait = BASE_DELAY_MS * 2 ** (attempt - 1);
    if (
      attempt < MAX_ATTEMPTS &&
      performance.now() + wait + MIN_ATTEMPT_MS <= deadline &&
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
