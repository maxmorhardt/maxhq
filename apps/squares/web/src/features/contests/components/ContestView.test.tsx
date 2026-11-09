import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeContest, makeViewer } from '../../../test/fixtures';
import { renderWithProviders } from '../../../test/render';
import type { ContestDialog } from './details/ContestDialogs';
import ContestView from './ContestView';

type Opener = { onOpen: (dialog: ContestDialog) => void };

vi.mock('./grid/ContestGrid', () => ({ default: () => <div data-testid="grid" /> }));
vi.mock('./details/ContestDetails', () => ({ default: () => <div data-testid="details" /> }));
vi.mock('./scoreboard/QuarterStrip', () => ({ default: () => <div data-testid="quarters" /> }));
vi.mock('./sidebar/ActivityFeed', () => ({ default: () => <div data-testid="feed" /> }));
vi.mock('./details/ContestActionIcons', () => ({
  default: ({ onOpen }: Opener) => (
    <button data-testid="actions" onClick={() => onOpen('players')}>
      players
    </button>
  ),
}));
vi.mock('./details/OwnerChecklist', () => ({
  default: ({ onOpen }: Opener) => (
    <button data-testid="checklist" onClick={() => onOpen('invite')}>
      invite
    </button>
  ),
}));
vi.mock('./details/ContestDialogs', () => ({
  default: ({ open }: { open: ContestDialog | null }) => (
    <div data-testid="dialogs">{open ?? 'closed'}</div>
  ),
}));

const renderView = (status: 'live' | 'reconnecting' = 'live', guideOwner = true) =>
  renderWithProviders(
    <ContestView
      contest={makeContest()}
      players={[]}
      activity={[]}
      viewer={makeViewer()}
      status={status}
      winnerFlash={null}
      onStale={vi.fn()}
      guideOwner={guideOwner}
    />
  );

describe('ContestView', () => {
  it('lays out every section once under the contest name', () => {
    renderView();
    expect(screen.getByRole('heading', { level: 1, name: 'Test Bowl' })).toBeInTheDocument();
    ['grid', 'details', 'quarters', 'feed', 'actions', 'checklist', 'dialogs'].forEach((id) =>
      expect(screen.getAllByTestId(id)).toHaveLength(1)
    );
  });

  it('opens the same dialogs from the header and the checklist', () => {
    renderView();
    expect(screen.getByTestId('dialogs')).toHaveTextContent('closed');
    fireEvent.click(screen.getByRole('button', { name: 'invite' }));
    expect(screen.getByTestId('dialogs')).toHaveTextContent('invite');
    fireEvent.click(screen.getByRole('button', { name: 'players' }));
    expect(screen.getByTestId('dialogs')).toHaveTextContent('players');
  });

  it('guides only owners who haven’t run a contest yet', () => {
    renderView('live', false);
    expect(screen.queryByTestId('checklist')).not.toBeInTheDocument();
  });

  it('shows the connection state when not live', () => {
    renderView('reconnecting');
    expect(screen.getByRole('status')).toHaveTextContent('Reconnecting…');
  });
});
