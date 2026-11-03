import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockAuth, mockMutation } from '../../../../test/auth';
import { makeContest } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { Game, Scoreboard } from '../../../../types/contest';
import CreateContestForm from './CreateContestForm';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
const api = vi.hoisted(() => ({ useCreateContestMutation: vi.fn() }));
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));
const games = vi.hoisted(() => ({ useGetScoreboardQuery: vi.fn(), useGetGameQuery: vi.fn() }));
vi.mock('../../../games/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...games,
}));
const ads = vi.hoisted(() => ({ trackConversion: vi.fn() }));
vi.mock('../../../../utils/googleAds', () => ads);
const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router', async () => ({
  ...(await vi.importActual<typeof import('react-router')>('react-router')),
  useNavigate: () => navigate,
}));

const game = {
  id: 'g-1',
  homeTeam: 'Lions',
  awayTeam: 'Bears',
  homeAbbr: 'DET',
  awayAbbr: 'CHI',
  gameTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  status: 'scheduled',
  season: 2026,
  seasonType: 2,
  week: 10,
} as Game;

const finished = {
  ...game,
  id: 'g-0',
  homeTeam: 'Packers',
  awayTeam: 'Vikings',
  homeAbbr: 'GB',
  awayAbbr: 'MIN',
  gameTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  status: 'final',
  period: 4,
} as Game;

const board: Scoreboard = {
  season: 2026,
  seasonType: 2,
  week: 10,
  label: 'Week 10',
  previous: { season: 2026, seasonType: 2, week: 9 },
  next: { season: 2026, seasonType: 2, week: 11 },
  games: [finished, game],
};

const lastScoreboardArgs = () => games.useGetScoreboardQuery.mock.lastCall;

const LINKED = '0b5f7f8e-6f3c-4a43-9d8d-1d1c7f1f0001';
const linkTo = (id: string) => ({ route: `/contests/create?game=${id}` });

describe('CreateContestForm', () => {
  let create: ReturnType<typeof vi.fn>;
  const refetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth({ email: 'owner@x.com' });
    games.useGetScoreboardQuery.mockReturnValue({
      data: board,
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch,
    });
    games.useGetGameQuery.mockReturnValue({ data: undefined, isLoading: false });
    const [trigger, state] = mockMutation(makeContest({ id: 'new' }));
    create = trigger;
    api.useCreateContestMutation.mockReturnValue([trigger, state]);
  });

  const nameField = () => screen.getByLabelText(/Contest Name/);
  const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Create Contest' }));
  const pickGame = () => fireEvent.click(screen.getByRole('radio', { name: 'Bears @ Lions' }));

  it('marks every missing field and focuses the first one', () => {
    renderWithProviders(<CreateContestForm />);
    submit();
    expect(screen.getByText('Pick the game this contest is played on')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Game' })).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(screen.getByRole('radio', { name: 'Bears @ Lions' })).toHaveFocus();
    expect(nameField()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Contest name is required')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('focuses the name once a game is picked', () => {
    renderWithProviders(<CreateContestForm />);
    pickGame();
    submit();
    expect(screen.queryByText('Pick the game this contest is played on')).not.toBeInTheDocument();
    expect(nameField()).toHaveFocus();

    fireEvent.change(nameField(), { target: { value: 'B' } });
    expect(screen.queryByText('Contest name is required')).not.toBeInTheDocument();
  });

  it('leaves the name for the owner to type', () => {
    renderWithProviders(<CreateContestForm />);
    pickGame();
    expect(nameField()).toHaveValue('');
    expect(screen.getByRole('radio', { name: 'Bears @ Lions' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('creates a contest on the picked game and opens it', async () => {
    renderWithProviders(<CreateContestForm />);
    fireEvent.change(nameField(), { target: { value: ' Bowl ' } });
    pickGame();
    fireEvent.click(screen.getByRole('radio', { name: 'Public' }));
    submit();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/contests/new'));
    expect(create).toHaveBeenCalledWith({
      name: 'Bowl',
      visibility: 'public',
      maxSquares: 10,
      gameId: 'g-1',
    });
    expect(ads.trackConversion).toHaveBeenCalledWith('contestCreated');
    expect(nameField()).toHaveValue(' Bowl ');
  });

  it('shows why creating failed', async () => {
    api.useCreateContestMutation.mockReturnValue(
      mockMutation({ error: { status: 500, message: 'Database unavailable' } })
    );
    renderWithProviders(<CreateContestForm />);
    pickGame();
    fireEvent.change(nameField(), { target: { value: 'Bowl' } });
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable');
    expect(nameField()).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('drops the game and asks for another when it is past the first quarter', async () => {
    api.useCreateContestMutation.mockReturnValue(
      mockMutation({ error: { status: 409, message: 'That game is past the first quarter' } })
    );
    renderWithProviders(<CreateContestForm />);
    pickGame();
    fireEvent.change(nameField(), { target: { value: 'Bowl' } });
    submit();

    expect(await screen.findByText('That game is past the first quarter')).toBeInTheDocument();
    const option = screen.getByRole('radio', { name: 'Bears @ Lions' });
    expect(option).toHaveAttribute('aria-checked', 'false');
    expect(option).toHaveFocus();
    expect(refetch).toHaveBeenCalled();
    expect(nameField()).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('explains a week with no games yet', () => {
    games.useGetScoreboardQuery.mockReturnValue({
      data: { ...board, games: [] },
      isLoading: false,
    });
    renderWithProviders(<CreateContestForm />);
    expect(screen.getByText(/No games scheduled this week yet/)).toBeInTheDocument();
    expect(screen.getByText('No game picked yet')).toBeInTheDocument();
  });

  it('waits for the week to load', () => {
    games.useGetScoreboardQuery.mockReturnValue({ data: undefined, isLoading: true });
    renderWithProviders(<CreateContestForm />);
    expect(screen.queryByRole('radiogroup', { name: 'Game' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next week' })).not.toBeInTheDocument();
  });

  it('opens on the week of the next kickoff', () => {
    renderWithProviders(<CreateContestForm />);
    expect(lastScoreboardArgs()).toEqual([{ upcoming: true }, { skip: false }]);
    expect(screen.getByRole('heading', { name: 'Week 10' })).toBeInTheDocument();
    expect(screen.getByText(/1 open/)).toBeInTheDocument();
  });

  it('shows games that have kicked off but never picks them', () => {
    renderWithProviders(<CreateContestForm />);
    const option = screen.getByRole('radio', { name: 'Vikings @ Packers, Final' });
    expect(option).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(option);
    expect(option).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('No game picked yet')).toBeInTheDocument();
  });

  it('steps through the weeks either side', () => {
    renderWithProviders(<CreateContestForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(lastScoreboardArgs()?.[0]).toEqual({ season: 2026, seasonType: 2, week: 11 });

    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }));
    expect(lastScoreboardArgs()?.[0]).toEqual({ season: 2026, seasonType: 2, week: 9 });
  });

  it('keeps the picked game while browsing other weeks', () => {
    renderWithProviders(<CreateContestForm />);
    pickGame();

    games.useGetScoreboardQuery.mockReturnValue({
      data: { ...board, week: 11, label: 'Week 11', games: [] },
      isLoading: false,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));

    expect(screen.getByRole('heading', { name: 'Week 11' })).toBeInTheDocument();
    expect(screen.queryByText('No game picked yet')).not.toBeInTheDocument();
  });

  it('offers a retry when the week fails to load', () => {
    games.useGetScoreboardQuery.mockReturnValue({ data: undefined, isError: true, refetch });
    renderWithProviders(<CreateContestForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('goes back to the list on cancel', () => {
    renderWithProviders(<CreateContestForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(navigate).toHaveBeenCalledWith('/contests');
  });

  it('sets how many squares the owner can claim', () => {
    renderWithProviders(<CreateContestForm />);
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Max squares' }), { key: 'ArrowRight' });
    expect(screen.getByText('11 of 100')).toBeInTheDocument();
  });

  it('arrives with the game a link asked for already picked, on its week', async () => {
    games.useGetGameQuery.mockReturnValue({ data: game, isLoading: false });
    renderWithProviders(<CreateContestForm />, linkTo(LINKED));
    expect(games.useGetGameQuery).toHaveBeenCalledWith(LINKED);
    expect(lastScoreboardArgs()?.[0]).toEqual({ season: 2026, seasonType: 2, week: 10 });
    expect(screen.getByRole('radio', { name: 'Bears @ Lions' })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    fireEvent.change(nameField(), { target: { value: 'Bowl' } });
    submit();

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(expect.objectContaining({ gameId: 'g-1' }))
    );
  });

  it('keeps a linked game picked after it kicks off, like one picked by hand', () => {
    games.useGetGameQuery.mockReturnValue({ data: game, isLoading: false });
    renderWithProviders(<CreateContestForm />, linkTo(LINKED));

    const now = vi.spyOn(Date, 'now').mockReturnValue(Date.parse(game.gameTime) + 60_000);
    fireEvent.change(nameField(), { target: { value: 'Bowl' } });

    expect(screen.queryByText('No game picked yet')).not.toBeInTheDocument();
    expect(lastScoreboardArgs()?.[0]).toEqual({ season: 2026, seasonType: 2, week: 10 });
    now.mockRestore();
  });

  it('never asks for a linked id that is not a uuid', () => {
    renderWithProviders(<CreateContestForm />, linkTo('..%2F..%2Faccounts%2Fusers%2Fme'));
    expect(games.useGetGameQuery).not.toHaveBeenCalledWith(expect.any(String));
    expect(lastScoreboardArgs()?.[0]).toEqual({ upcoming: true });
  });

  it('opens on the upcoming week when the linked game has no week number', () => {
    games.useGetGameQuery.mockReturnValue({ data: { ...game, week: 0 }, isLoading: false });
    renderWithProviders(<CreateContestForm />, linkTo(LINKED));
    expect(lastScoreboardArgs()?.[0]).toEqual({ upcoming: true });
    expect(screen.queryByText('No game picked yet')).not.toBeInTheDocument();
  });

  it('waits for the linked game before choosing a week', () => {
    games.useGetGameQuery.mockReturnValue({ data: undefined, isLoading: true });
    renderWithProviders(<CreateContestForm />, linkTo(LINKED));
    expect(lastScoreboardArgs()?.[1]).toEqual({ skip: true });
  });

  it('goes back to the opening week when another week fails to load', () => {
    renderWithProviders(<CreateContestForm />);
    games.useGetScoreboardQuery.mockReturnValue({ data: undefined, isError: true, refetch });
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));

    games.useGetScoreboardQuery.mockReturnValue({ data: board, isLoading: false, refetch });
    fireEvent.click(screen.getByRole('button', { name: 'Back to this week' }));

    expect(lastScoreboardArgs()?.[0]).toEqual({ upcoming: true });
    expect(screen.getByRole('heading', { name: 'Week 10' })).toBeInTheDocument();
  });

  it('asks for a game when the one a link asked for has kicked off', () => {
    games.useGetGameQuery.mockReturnValue({ data: finished, isLoading: false });
    renderWithProviders(<CreateContestForm />, linkTo('0b5f7f8e-6f3c-4a43-9d8d-1d1c7f1f0000'));
    expect(lastScoreboardArgs()?.[0]).toEqual({ upcoming: true });
    expect(screen.getByText('No game picked yet')).toBeInTheDocument();

    fireEvent.change(nameField(), { target: { value: 'Bowl' } });
    submit();

    expect(create).not.toHaveBeenCalled();
    expect(screen.getByText('Pick the game this contest is played on')).toBeInTheDocument();
  });
});
