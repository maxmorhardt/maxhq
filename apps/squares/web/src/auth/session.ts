import { API_BASE_URL } from '../api/baseQuery';

const SESSION_CALL_TIMEOUT_MS = 4_000;

// sign-out revokes the token on the server so a copy of it stops working; restore lifts the block
// a deleted account leaves behind, and is only ever sent right after an interactive sign-in
export async function notifySession(
  action: 'sign-out' | 'restore',
  token: string | null | undefined
): Promise<void> {
  if (!token) {
    return;
  }

  try {
    await fetch(`${API_BASE_URL}/users/me/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(SESSION_CALL_TIMEOUT_MS),
    });
  } catch {
    // best effort: the user is signed in or out locally either way
  }
}
