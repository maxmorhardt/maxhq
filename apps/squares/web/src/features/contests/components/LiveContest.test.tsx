import { act, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockAuth } from '../../../test/auth';
import { makeContest, makeParticipant, makeQuarterResult } from '../../../test/fixtures';
import { renderWithProviders } from '../../../test/render';
import type { ContestEvent } from '../live/events';
import {
  eventReceived,
  streamEnded,
  streamOpened,
  streamStatusChanged,
} from '../live/liveContestSlice';
import LiveContest from './LiveContest';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
const stream = vi.hoisted(() => ({
  onEvent: undefined as ((e: ContestEvent) => void) | undefined,
  resync: vi.fn(),
}));
vi.mock('../live/useContestStream', () => ({
  useContestStream: (_: string, onEvent: (e: ContestEvent) => void) => {
    stream.onEvent = onEvent;
    return { resync: stream.resync };
  },
}));
vi.mock('./ContestView', () => ({
  default: ({ winnerFlash }: { winnerFlash: unknown }) => (
    <div data-testid="view">{winnerFlash ? 'flash' : ''}</div>
  ),
}));
const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router', async () => ({
  ...(await vi.importActual<typeof import('react-router')>('react-router')),
  useNavigate: () => navigate,
}));

const event = (type: ContestEvent['type'], data?: unknown) =>
  ({ type, contestId: 'c-1', updatedBy: 'u', timestamp: '', data }) as ContestEvent;

function renderLive() {
  const result = renderWithProviders(<LiveContest contestId="c-1" />);
  const dispatch = (action: Parameters<typeof result.store.dispatch>[0]) =>
    act(() => {
      result.store.dispatch(action);
    });
  const emit = (e: ContestEvent) => act(() => stream.onEvent?.(e));
  const snapshot = (contest = makeContest()) =>
    dispatch(
      eventReceived({ id: '1', event: event('contest.snapshot', { contest, participants: [] }) })
    );
  return {
    ...result,
    dispatch,
    emit,
    snapshot,
    toasts: () => result.store.getState().toast.messages,
  };
}

describe('LiveContest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth({ email: 'player@x.com' });
  });

  it('shows a skeleton until the snapshot arrives', () => {
    const { snapshot } = renderLive();
    expect(screen.queryByTestId('view')).not.toBeInTheDocument();
    snapshot();
    expect(screen.getByTestId('view')).toBeInTheDocument();
  });

  it('offers a retry when it cannot connect', () => {
    const { dispatch } = renderLive();
    dispatch(streamOpened('c-1'));
    dispatch(streamStatusChanged('failed'));
    act(() => screen.getByRole('button', { name: /try again/i }).click());
    expect(stream.resync).toHaveBeenCalled();
  });

  it('shows forbidden and not-found pages when the server refuses', () => {
    const { dispatch } = renderLive();
    dispatch(streamEnded('forbidden'));
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    dispatch(streamEnded('not_found'));
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });

  it('leaves a deleted contest', () => {
    const { emit, toasts } = renderLive();
    emit(event('contest.deleted'));
    expect(navigate).toHaveBeenCalledWith('/contests');
    expect(toasts()[0]?.message).toBe('Contest has been deleted');
  });

  it('flashes the winning square and celebrates the viewer’s win', () => {
    const { snapshot, emit } = renderLive();
    snapshot();
    emit(event('quarter.recorded', makeQuarterResult({ winner: 'player@x.com' })));
    expect(screen.getByTestId('view')).toHaveTextContent('flash');
    expect(screen.getByText('You Won!')).toBeInTheDocument();
  });

  it('only celebrates the viewer’s own wins', () => {
    const { snapshot, emit } = renderLive();
    snapshot();
    emit(event('quarter.recorded', makeQuarterResult({ winner: 'someone@x.com' })));
    expect(screen.queryByText('You Won!')).not.toBeInTheDocument();
  });

  it('sends a removed viewer away from a private contest', () => {
    const { snapshot, emit, toasts } = renderLive();
    snapshot(makeContest({ visibility: 'private' }));
    emit(event('participant.removed', makeParticipant({ userId: 'player@x.com' })));
    expect(navigate).toHaveBeenCalledWith('/contests');
    expect(toasts()[0]?.severity).toBe('warning');
  });

  it('lets a removed viewer keep watching a public contest', () => {
    const { snapshot, emit, toasts } = renderLive();
    snapshot(makeContest({ visibility: 'public' }));
    emit(event('participant.removed', makeParticipant({ userId: 'player@x.com' })));
    expect(navigate).not.toHaveBeenCalled();
    expect(toasts()[0]?.severity).toBe('info');
  });

  it('ignores other people being removed', () => {
    const { emit, toasts } = renderLive();
    emit(event('participant.removed', makeParticipant({ userId: 'other@x.com' })));
    expect(toasts()).toHaveLength(0);
  });
});
