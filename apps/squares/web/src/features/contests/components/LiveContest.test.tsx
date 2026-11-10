import { act, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockAuth } from '../../../test/auth';
import { makeContest, makePlayer, makeQuarterResult } from '../../../test/fixtures';
import { renderWithProviders } from '../../../test/render';
import type { Player } from '../../../types/contest';
import type { ContestEvent } from '../live/events';
import type { LiveContestState } from '../live/liveContestSlice';
import {
  eventReceived,
  streamEnded,
  streamOpened,
  streamStatusChanged,
} from '../live/liveContestSlice';
import type { ContestViewer } from '../live/viewer';
import LiveContest from './LiveContest';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
// accounts is down for every test here: the page must know the viewer from the contest alone
vi.mock('../../profile/api', () => ({
  useGetMyProfileQuery: vi.fn(() => ({ data: undefined, isLoading: false, isError: true })),
}));
const stream = vi.hoisted(() => ({
  onEvent: undefined as ((e: ContestEvent, before: LiveContestState) => void) | undefined,
  resync: vi.fn(),
}));
vi.mock('../live/useContestStream', () => ({
  useContestStream: (_: string, onEvent: (e: ContestEvent, before: LiveContestState) => void) => {
    stream.onEvent = onEvent;
    return { resync: stream.resync };
  },
}));
vi.mock('./ContestView', () => ({
  default: ({
    winnerFlash,
    game,
    viewer,
    guideOwner,
  }: {
    winnerFlash: unknown;
    game?: { homeScore: number };
    viewer: ContestViewer;
    guideOwner: boolean;
  }) => (
    <div
      data-testid="view"
      data-score={game?.homeScore}
      data-full-name={viewer.fullName('u_pat')}
      data-guide={guideOwner}
    >
      {winnerFlash ? 'flash' : ''}
    </div>
  ),
}));
const history = vi.hoisted(() => ({ useHasFinishedOwnContestQuery: vi.fn() }));
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...history,
}));
const roster = vi.hoisted(() => ({ useContestRoster: vi.fn() }));
vi.mock('../useContestRoster', () => roster);
const games = vi.hoisted(() => ({ useGetGameQuery: vi.fn(), useGameStream: vi.fn() }));
vi.mock('../../games/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useGetGameQuery: games.useGetGameQuery,
}));
vi.mock('../../games/useGameStream', () => ({ useGameStream: games.useGameStream }));
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
  const emit = (e: ContestEvent) =>
    act(() => stream.onEvent?.(e, result.store.getState().liveContest));
  const snapshot = (contest = makeContest(), players: Player[] = []) =>
    dispatch(
      eventReceived({
        id: '1',
        event: event('contest.snapshot', { contest, players, viewerId: 'u_player' }),
      })
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
    games.useGetGameQuery.mockReturnValue({ data: undefined });
    roster.useContestRoster.mockReturnValue(undefined);
    history.useHasFinishedOwnContestQuery.mockReturnValue({ data: undefined, isError: false });
    mockAuth({ email: 'player@x.com' });
  });

  it('gives only the owner full names', () => {
    roster.useContestRoster.mockImplementation((_id: string, isOwner: boolean) =>
      isOwner ? [{ userId: 'u_pat', fullName: 'Pat Parker' }] : undefined
    );
    const players = [makePlayer({ userId: 'u_pat' })];
    const { snapshot } = renderLive();
    snapshot(makeContest(), players);
    expect(roster.useContestRoster).toHaveBeenLastCalledWith('c-1', false, players);
    expect(screen.getByTestId('view')).not.toHaveAttribute('data-full-name');

    snapshot(makeContest({ owner: 'u_player' }), players);
    expect(roster.useContestRoster).toHaveBeenLastCalledWith('c-1', true, players);
    expect(screen.getByTestId('view')).toHaveAttribute('data-full-name', 'Pat Parker');
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

  it('reads the score from the games service and follows it live', () => {
    games.useGetGameQuery.mockReturnValue({
      data: { id: 'g-1', status: 'in_progress', homeScore: 14 },
    });
    const { snapshot } = renderLive();
    snapshot(makeContest({ gameId: 'g-1' }));

    expect(games.useGetGameQuery).toHaveBeenLastCalledWith('g-1');
    expect(games.useGameStream).toHaveBeenLastCalledWith('g-1');
    expect(screen.getByTestId('view')).toHaveAttribute('data-score', '14');
  });

  it('does not follow a game that is over', () => {
    games.useGetGameQuery.mockReturnValue({ data: { id: 'g-1', status: 'final', homeScore: 14 } });
    const { snapshot } = renderLive();
    snapshot(makeContest({ gameId: 'g-1' }));

    expect(games.useGameStream).toHaveBeenLastCalledWith(undefined);
  });

  it('leaves the games stream closed for a contest without a game', () => {
    games.useGetGameQuery.mockReturnValue({ data: undefined });
    const { snapshot } = renderLive();
    snapshot(makeContest({ gameId: undefined }));

    expect(games.useGameStream).toHaveBeenLastCalledWith(undefined);
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
    emit(event('quarter.recorded', makeQuarterResult({ winner: 'u_player' })));
    expect(screen.getByTestId('view')).toHaveTextContent('flash');
    expect(screen.getByText('Your Square Hit')).toBeInTheDocument();
  });

  it('labels the celebration with the game’s team abbreviations once it has loaded', () => {
    games.useGetGameQuery.mockReturnValue({ data: { homeAbbr: 'NO', awayAbbr: 'PIT' } });
    const { snapshot, emit } = renderLive();
    snapshot(makeContest({ gameId: 'g-1' }));
    emit(event('quarter.recorded', makeQuarterResult({ winner: 'u_player' })));
    expect(screen.getByText('PIT')).toBeInTheDocument();
    expect(screen.getByText('NO')).toBeInTheDocument();
  });

  it('falls back to away and home while the game is still loading', () => {
    const { snapshot, emit } = renderLive();
    snapshot();
    emit(event('quarter.recorded', makeQuarterResult({ winner: 'u_player' })));
    expect(screen.getByText('Away')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('only celebrates the viewer’s own wins', () => {
    const { snapshot, emit } = renderLive();
    snapshot();
    emit(event('quarter.recorded', makeQuarterResult({ winner: 'u_someone' })));
    expect(screen.queryByText('Your Square Hit')).not.toBeInTheDocument();
  });

  it('sends a removed viewer away from a private contest', () => {
    const { snapshot, emit, toasts } = renderLive();
    snapshot(makeContest({ visibility: 'private' }));
    emit(event('player.removed', makePlayer({ userId: 'u_player' })));
    expect(navigate).toHaveBeenCalledWith('/contests');
    expect(toasts()[0]?.severity).toBe('warning');
  });

  it('lets a removed viewer keep watching a public contest', () => {
    const { snapshot, emit, toasts } = renderLive();
    snapshot(makeContest({ visibility: 'public' }));
    emit(event('player.removed', makePlayer({ userId: 'u_player' })));
    expect(navigate).not.toHaveBeenCalled();
    expect(toasts()[0]?.severity).toBe('info');
  });

  it('says you left rather than were removed when you left on your own', () => {
    const { snapshot, emit, toasts } = renderLive();
    snapshot(makeContest({ visibility: 'private' }));
    emit({
      ...event('player.removed', makePlayer({ userId: 'u_player' })),
      updatedBy: 'u_player',
    });
    expect(toasts()[0]).toMatchObject({ message: 'You left this contest', severity: 'info' });
    expect(navigate).toHaveBeenCalledWith('/contests');
  });

  it('tells the owner when someone joins before kickoff', () => {
    const { snapshot, emit, toasts } = renderLive();
    snapshot(makeContest({ owner: 'u_player' }));
    emit(event('player.joined', makePlayer({ userId: 'u_new', displayName: 'Nia N.' })));
    expect(toasts()[0]).toMatchObject({
      message: 'Nia N. joined. Give them squares to play.',
      severity: 'info',
    });
  });

  it('tells the viewer who won a quarter when it wasn’t them', () => {
    const { snapshot, emit, toasts } = renderLive();
    snapshot();
    emit(event('quarter.recorded', makeQuarterResult({ winner: 'u_pat', winnerName: 'Pat P.' })));
    expect(toasts()[0]?.message).toBe('Pat P. wins Q1.');
  });

  it('guides an owner who hasn’t finished a contest, or can’t tell', () => {
    history.useHasFinishedOwnContestQuery.mockReturnValue({ data: false, isError: false });
    const { snapshot } = renderLive();
    snapshot();
    expect(screen.getByTestId('view')).toHaveAttribute('data-guide', 'false');

    snapshot(makeContest({ owner: 'u_player' }));
    expect(screen.getByTestId('view')).toHaveAttribute('data-guide', 'true');

    history.useHasFinishedOwnContestQuery.mockReturnValue({ data: undefined, isError: true });
    snapshot(makeContest({ owner: 'u_player', version: 2 }));
    expect(screen.getByTestId('view')).toHaveAttribute('data-guide', 'true');
  });

  it('leaves an experienced owner unguided, and waits until it knows', () => {
    history.useHasFinishedOwnContestQuery.mockReturnValue({ data: true, isError: false });
    const { snapshot } = renderLive();
    snapshot(makeContest({ owner: 'u_player' }));
    expect(screen.getByTestId('view')).toHaveAttribute('data-guide', 'false');

    history.useHasFinishedOwnContestQuery.mockReturnValue({ data: undefined, isError: false });
    snapshot(makeContest({ owner: 'u_player', version: 2 }));
    expect(screen.getByTestId('view')).toHaveAttribute('data-guide', 'false');
  });

  it('ignores other people being removed', () => {
    const { emit, toasts } = renderLive();
    emit(event('player.removed', makePlayer({ userId: 'u_other' })));
    expect(toasts()).toHaveLength(0);
  });
});
