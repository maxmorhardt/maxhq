import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockAuth, mockMutation } from '../../../../test/auth';
import { makeContest } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { Game } from '../../../../types/contest';
import CreateContestForm from './CreateContestForm';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
const api = vi.hoisted(() => ({ useCreateContestMutation: vi.fn() }));
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));
const games = vi.hoisted(() => ({ useGetUpcomingGamesQuery: vi.fn() }));
vi.mock('../../../games/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...games,
}));
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
} as Game;

describe('CreateContestForm', () => {
  let create: ReturnType<typeof vi.fn>;
  const refetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth({ email: 'owner@x.com' });
    games.useGetUpcomingGamesQuery.mockReturnValue({ data: [game], isLoading: false, refetch });
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
      owner: 'owner@x.com',
      visibility: 'public',
      maxSquares: 10,
      gameId: 'g-1',
    });
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

  it('needs an email to create a contest', () => {
    mockAuth({});
    renderWithProviders(<CreateContestForm />);
    pickGame();
    fireEvent.change(nameField(), { target: { value: 'Bowl' } });
    submit();
    expect(screen.getByText('User is missing an email')).toBeInTheDocument();
  });

  it('explains when there are no games to pick', () => {
    games.useGetUpcomingGamesQuery.mockReturnValue({ data: [], isLoading: false });
    renderWithProviders(<CreateContestForm />);
    expect(screen.getByText(/No upcoming games available/)).toBeInTheDocument();
    expect(screen.getByText('No game picked yet')).toBeInTheDocument();
  });

  it('waits for games to load', () => {
    games.useGetUpcomingGamesQuery.mockReturnValue({ data: undefined, isLoading: true });
    renderWithProviders(<CreateContestForm />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
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
});
