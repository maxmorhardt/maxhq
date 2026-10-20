import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeStore } from '../../app/store';
import { mockAuth, mockMutation } from '../../test/auth';
import { useAccountDeletion } from './useAccountDeletion';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
const api = vi.hoisted(() => ({
  useGetMyActiveContestsQuery: vi.fn(),
  useDeleteMyAccountMutation: vi.fn(),
}));
vi.mock('./api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));
const contests = vi.hoisted(() => ({
  useDeleteContestMutation: vi.fn(),
  useRemoveParticipantMutation: vi.fn(),
}));
vi.mock('../contests/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...contests,
}));
const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router', async () => ({
  ...(await vi.importActual<typeof import('react-router')>('react-router')),
  useNavigate: () => navigate,
}));

const refetch = vi.fn();

function setup() {
  const store = makeStore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <MemoryRouter>{children}</MemoryRouter>
    </Provider>
  );
  return { store, ...renderHook(() => useAccountDeletion(), { wrapper }) };
}

describe('useAccountDeletion', () => {
  let auth: ReturnType<typeof mockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    auth = mockAuth({ email: 'me@x.com' });
    api.useGetMyActiveContestsQuery.mockReturnValue({ data: [], isError: false, refetch });
    api.useDeleteMyAccountMutation.mockReturnValue(mockMutation(undefined));
    contests.useDeleteContestMutation.mockReturnValue(mockMutation(undefined));
    contests.useRemoveParticipantMutation.mockReturnValue(mockMutation(undefined));
  });

  it('only checks active contests once the dialog opens', () => {
    const { result } = setup();
    expect(api.useGetMyActiveContestsQuery).toHaveBeenLastCalledWith(
      undefined,
      expect.objectContaining({ skip: true })
    );
    act(() => result.current.openDialog());
    expect(result.current.dialogProps.open).toBe(true);
    expect(api.useGetMyActiveContestsQuery).toHaveBeenLastCalledWith(
      undefined,
      expect.objectContaining({ skip: false })
    );
  });

  it('deletes owned contests and leaves joined ones', async () => {
    const [deleteContest, deleteState] = mockMutation(undefined);
    const [leave, leaveState] = mockMutation(undefined);
    contests.useDeleteContestMutation.mockReturnValue([deleteContest, deleteState]);
    contests.useRemoveParticipantMutation.mockReturnValue([leave, leaveState]);
    const { result } = setup();

    await act(() => result.current.dialogProps.onDeleteContest('c-1'));
    await act(() => result.current.dialogProps.onLeaveContest('c-2'));

    expect(deleteContest).toHaveBeenCalledWith('c-1');
    expect(leave).toHaveBeenCalledWith({ contestId: 'c-2', userId: 'me@x.com' });
    expect(result.current.dialogProps.busyId).toBeNull();
  });

  it('explains a contest action that failed', async () => {
    contests.useDeleteContestMutation.mockReturnValue(
      mockMutation({ error: { status: 500, message: 'x' } })
    );
    const { result } = setup();
    await act(() => result.current.dialogProps.onDeleteContest('c-1'));
    expect(result.current.dialogProps.actionError).toBe(
      'Failed to delete the contest. Please try again.'
    );
  });

  it('deletes the account, signs out, and goes home', async () => {
    const { result, store } = setup();
    await act(() => result.current.dialogProps.onConfirmDelete());
    expect(auth.removeUser).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/');
    expect(store.getState().toast.messages[0]?.message).toBe('Your account has been deleted');
  });

  it('rechecks contests when the account cannot be deleted', async () => {
    api.useDeleteMyAccountMutation.mockReturnValue(
      mockMutation({ error: { status: 409, message: 'x' } })
    );
    const { result } = setup();
    await act(() => result.current.dialogProps.onConfirmDelete());
    await waitFor(() => expect(refetch).toHaveBeenCalled());
    expect(result.current.dialogProps.actionError).toBe(
      'Failed to delete your account. Please try again.'
    );
  });

  it('retries the contest check and closes', () => {
    const { result } = setup();
    act(() => result.current.openDialog());
    act(() => result.current.dialogProps.onRetry());
    expect(refetch).toHaveBeenCalled();
    act(() => result.current.dialogProps.onClose());
    expect(result.current.dialogProps.open).toBe(false);
  });
});
