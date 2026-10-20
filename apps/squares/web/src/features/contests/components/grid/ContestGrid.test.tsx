import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockMutation } from '../../../../test/auth';
import { makeContest, makeQuarterResult, makeSquare, makeViewer } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { Contest } from '../../../../types/contest';
import type { ContestViewer } from '../../live/viewer';
import ContestGrid from './ContestGrid';

const api = vi.hoisted(() => ({
  useClaimSquareMutation: vi.fn(),
  useClearSquareMutation: vi.fn(),
}));
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));
const profile = vi.hoisted(() => ({ useGetMyProfileQuery: vi.fn() }));
vi.mock('../../../profile/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...profile,
}));
const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router', async () => ({
  ...(await vi.importActual<typeof import('react-router')>('react-router')),
  useNavigate: () => navigate,
}));

const contest = makeContest({
  homeTeam: 'Lions',
  awayTeam: 'Bears',
  squares: [
    makeSquare({ id: 'mine', row: 0, col: 0, value: 'ME', owner: 'player@x.com', ownerName: 'Me' }),
    makeSquare({ id: 'empty', row: 0, col: 1 }),
  ],
  xLabels: [3, 7],
  yLabels: [1],
});

function renderGrid(overrides: { contest?: Contest; viewer?: ContestViewer } = {}) {
  const onStale = vi.fn();
  const result = renderWithProviders(
    <ContestGrid
      contest={overrides.contest ?? contest}
      viewer={overrides.viewer ?? makeViewer()}
      winnerFlash={null}
      onStale={onStale}
    />
  );
  const cells = () => screen.getAllByRole('button');
  return { ...result, onStale, cells, toasts: () => result.store.getState().toast.messages };
}

describe('ContestGrid', () => {
  let claim: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    profile.useGetMyProfileQuery.mockReturnValue({ data: { defaultInitials: 'ME' } });
    const [trigger, state] = mockMutation(makeSquare());
    claim = trigger;
    api.useClaimSquareMutation.mockReturnValue([trigger, state]);
    api.useClearSquareMutation.mockReturnValue(mockMutation(makeSquare()));
  });

  it('draws the teams, labels, and claimed squares', () => {
    renderGrid();
    expect(screen.getByText('Lions')).toBeInTheDocument();
    expect(screen.getByText('Bears')).toBeInTheDocument();
    expect(screen.getByText('ME')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('claims an empty square', async () => {
    const { cells } = renderGrid();
    fireEvent.click(cells()[1]);
    await waitFor(() =>
      expect(claim).toHaveBeenCalledWith({ contestId: 'c-1', squareId: 'empty' })
    );
  });

  it('opens the details of a claimed square', () => {
    const { cells } = renderGrid();
    fireEvent.click(cells()[0]);
    expect(screen.getByText('Your Square')).toBeInTheDocument();
  });

  it('stops spectators from claiming', () => {
    const { cells, toasts } = renderGrid({
      viewer: makeViewer({ isParticipant: false, participant: undefined }),
    });
    fireEvent.click(cells()[1]);
    expect(toasts()[0]?.message).toBe('You need to be a participant to claim squares');
    expect(claim).not.toHaveBeenCalled();
  });

  it('stops a participant at their limit', () => {
    const { cells, toasts } = renderGrid({ viewer: makeViewer({ squaresLeft: 0 }) });
    fireEvent.click(cells()[1]);
    expect(toasts()[0]?.message).toBe('Square limit reached');
  });

  it('sends the user to set initials first', () => {
    profile.useGetMyProfileQuery.mockReturnValue({ data: undefined });
    const { cells } = renderGrid();
    fireEvent.click(cells()[1]);
    expect(navigate).toHaveBeenCalledWith('/profile');
  });

  it('resyncs when a claim conflicts', async () => {
    api.useClaimSquareMutation.mockReturnValue(
      mockMutation({ error: { status: 409, message: 'Taken' } })
    );
    const { cells, onStale, toasts } = renderGrid();
    fireEvent.click(cells()[1]);
    await waitFor(() => expect(onStale).toHaveBeenCalled());
    expect(toasts()[0]?.message).toBe('Taken');
  });

  it('shows square details once the game is under way', () => {
    const { cells } = renderGrid({
      contest: {
        ...contest,
        status: 'Q1',
        quarterResults: [makeQuarterResult({ winnerRow: 0, winnerCol: 1 })],
      },
    });
    fireEvent.click(cells()[1]);
    expect(screen.getByText('Empty Square')).toBeInTheDocument();
    expect(screen.getByText('Winner · Q1')).toBeInTheDocument();
  });
});
