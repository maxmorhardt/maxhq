import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { isAxiosError } from 'axios';
import api from './api';

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 300;
const RETRYABLE_STATUSES = [502, 503, 504];

export const IDEMPOTENCY_HEADER = 'Idempotency-Key';

// a dropped connection or a gateway hiccup leaves the outcome unknown, so the same key is sent again;
// a 409 with Retry-After means the first attempt is still running on the server
function isRetryable(err: unknown): boolean {
  if (!isAxiosError(err)) {
    return false;
  }

  const response = err.response;
  if (!response) {
    return true;
  }

  if (response.status === 409 && response.headers?.['retry-after']) {
    return true;
  }

  return RETRYABLE_STATUSES.includes(response.status);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// one key per logical action: every retry replays the server's first answer instead of acting twice
export async function idempotentRequest<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  const key = crypto.randomUUID();

  for (let attempt = 1; ; attempt++) {
    try {
      return await api.request<T>({
        ...config,
        headers: { ...config.headers, [IDEMPOTENCY_HEADER]: key },
      });
    } catch (err: unknown) {
      if (attempt >= MAX_ATTEMPTS || !isRetryable(err)) {
        throw err;
      }
      await delay(BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }
}
