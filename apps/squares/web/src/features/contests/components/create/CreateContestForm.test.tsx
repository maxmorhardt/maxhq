import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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

  it('requires a name', () => {
    renderWithProviders(<CreateContestForm />);
    fireEvent.submit(nameField().closest('form')!);
    expect(screen.getByText('Contest name is required')).toBeInTheDocument();
  });

  it('requires a game in live mode', () => {
    renderWithProviders(<CreateContestForm />);
    fireEvent.change(nameField(), { target: { value: 'Bowl' } });
    fireEvent.submit(nameField().closest('form')!);
    expect(screen.getByText('Select a game or switch to manual scoring')).toBeInTheDocument();
  });

  it('creates a game-linked contest and opens it', async () => {
    renderWithProviders(<CreateContestForm />);
    fireEvent.change(nameField(), { target: { value: ' Bowl ' } });
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(within(screen.getByRole('listbox')).getByText(/Bears @ Lions/));
    submit();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/contests/new'));
    expect(create).toHaveBeenCalledWith({
      name: 'Bowl',
      owner: 'owner@x.com',
      homeTeam: undefined,
      awayTeam: undefined,
      visibility: 'private',
      maxSquares: 10,
      gameId: 'g-1',
    });
  });

  it('creates a manual public contest with its teams', async () => {
    renderWithProviders(<CreateContestForm />);
    fireEvent.change(nameField(), { target: { value: 'Bowl' } });
    fireEvent.click(screen.getByRole('button', { name: 'Manual' }));
    fireEvent.change(screen.getByLabelText('Home Team'), { target: { value: 'Lions' } });
    fireEvent.change(screen.getByLabelText('Away Team'), { target: { value: 'Bears' } });
    fireEvent.click(screen.getByRole('button', { name: 'Public' }));
    submit();

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          homeTeam: 'Lions',
          awayTeam: 'Bears',
          visibility: 'public',
          gameId: undefined,
        })
      )
    );
  });

  it('shows why creating failed', async () => {
    api.useCreateContestMutation.mockReturnValue(
      mockMutation({ error: { status: 400, message: 'Name taken' } })
    );
    renderWithProviders(<CreateContestForm />);
    fireEvent.change(nameField(), { target: { value: 'Bowl' } });
    fireEvent.click(screen.getByRole('button', { name: 'Manual' }));
    submit();
    expect(await screen.findByText('Name taken')).toBeInTheDocument();
  });

  it('explains when there are no games to link', () => {
    api.useGetUpcomingGamesQuery.mockReturnValue({ data: [], isLoading: false });
    renderWithProviders(<CreateContestForm />);
    expect(screen.getByText(/No upcoming games available/)).toBeInTheDocument();
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
});
