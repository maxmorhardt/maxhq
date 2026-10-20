import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockAuth } from '../../../test/auth';
import { renderWithProviders } from '../../../test/render';
import Profile from './Profile';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
const api = vi.hoisted(() => ({ useGetMyProfileQuery: vi.fn(), useGetMyStatsQuery: vi.fn() }));
vi.mock('../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));
const leaderboard = vi.hoisted(() => ({ useGetMyRankQuery: vi.fn() }));
vi.mock('../../leaderboard/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...leaderboard,
}));
const deletion = vi.hoisted(() => ({ openDialog: vi.fn() }));
vi.mock('../useAccountDeletion', () => ({
  useAccountDeletion: () => ({ openDialog: deletion.openDialog, dialogProps: { open: false } }),
}));
vi.mock('./DeleteAccountDialog', () => ({ default: () => null }));
vi.mock('./InitialsCard', () => ({
  default: ({ initials }: { initials?: string }) => <div data-testid="initials">{initials}</div>,
}));

const loaded = (data: unknown) => ({ data, isLoading: false, isError: false });

describe('Profile', () => {
  beforeEach(() => {
    mockAuth({ email: 'ann@x.com' });
    api.useGetMyProfileQuery.mockReturnValue(
      loaded({
        email: 'ann@x.com',
        displayName: 'ann smith',
        defaultInitials: 'AS',
        createdAt: '2025-03-01T00:00:00Z',
      })
    );
    api.useGetMyStatsQuery.mockReturnValue(
      loaded({
        contestsCreated: 2,
        contestsJoined: 3,
        squaresClaimed: 40,
        quarterWins: 4,
        quartersPlayed: 16,
      })
    );
    leaderboard.useGetMyRankQuery.mockReturnValue(
      loaded({ rank: 7, totalRanked: 50, quarterWins: 4, ranked: true })
    );
  });

  it('shows who the user is and their numbers', () => {
    renderWithProviders(<Profile />);
    expect(screen.getByRole('heading', { name: 'ann smith' })).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText(/Member since/)).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('25% win rate')).toBeInTheDocument();
    expect(screen.getByTestId('initials')).toHaveTextContent('AS');
  });

  it('shows a skeleton while anything loads', () => {
    api.useGetMyStatsQuery.mockReturnValue({ isLoading: true });
    renderWithProviders(<Profile />);
    expect(screen.queryByText('Your Numbers')).not.toBeInTheDocument();
  });

  it('reports a profile that failed to load and blocks deletion', () => {
    api.useGetMyProfileQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    renderWithProviders(<Profile />);
    expect(screen.getByText(/couldn't load your profile/)).toBeInTheDocument();
    expect(screen.getByText('ann@x.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Account' })).toBeDisabled();
  });

  it('starts account deletion', () => {
    renderWithProviders(<Profile />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Account' }));
    expect(deletion.openDialog).toHaveBeenCalled();
  });
});
