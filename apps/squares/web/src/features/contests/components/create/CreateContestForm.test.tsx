import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockAuth, mockMutation } from '../../../../test/auth';
import { makeContest } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { Game } from '../../../../types/contest';
import CreateContestForm from './CreateContestForm';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
const api = vi.hoisted(() => ({
  useGetUpcomingGamesQuery: vi.fn(),
  useCreateContestMutation: vi.fn(),
}));
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));
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
  gameTime: '2026-11-01T18:00:00Z',
} as Game;

describe('CreateContestForm', () => {
  let create: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth({ email: 'owner@x.com' });
    api.useGetUpcomingGamesQuery.mockReturnValue({ data: [game], isLoading: false });
    const [trigger, state] = mockMutation(makeContest({ id: 'new' }));
    create = trigger;
    api.useCreateContestMutation.mockReturnValue([trigger, state]);
  });

  const nameField = () => screen.getByLabelText(/Contest Name/);
  const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Create Contest' }));
  const pickGame = () => fireEvent.click(screen.getByRole('radio', { name: 'Bears @ Lions' }));

  it('requires a name', () => {
    renderWithProviders(<CreateContestForm />);
    fireEvent.submit(nameField().closest('form')!);
    expect(screen.getByText('Contest name is required')).toBeInTheDocument();
  });

  it('requires a game', () => {
    renderWithProviders(<CreateContestForm />);
    fireEvent.change(nameField(), { target: { value: 'Bowl' } });
    submit();
    expect(screen.getByText('Pick the game this contest is played on')).toBeInTheDocument();
  });

  it('names the contest after the matchup until the owner types one', () => {
    renderWithProviders(<CreateContestForm />);
    pickGame();
    expect(nameField()).toHaveValue('CHI @ DET');
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
      mockMutation({ error: { status: 400, message: 'Name taken' } })
    );
    renderWithProviders(<CreateContestForm />);
    pickGame();
    submit();
    expect(await screen.findByText('Name taken')).toBeInTheDocument();
  });

  it('needs an email to create a contest', () => {
    mockAuth({});
    renderWithProviders(<CreateContestForm />);
    pickGame();
    submit();
    expect(screen.getByText('User is missing an email')).toBeInTheDocument();
  });

  it('explains when there are no games to pick', () => {
    api.useGetUpcomingGamesQuery.mockReturnValue({ data: [], isLoading: false });
    renderWithProviders(<CreateContestForm />);
    expect(screen.getByText(/No upcoming games available/)).toBeInTheDocument();
    expect(screen.getByText('No game picked yet')).toBeInTheDocument();
  });

  it('waits for games to load', () => {
    api.useGetUpcomingGamesQuery.mockReturnValue({ data: undefined, isLoading: true });
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
