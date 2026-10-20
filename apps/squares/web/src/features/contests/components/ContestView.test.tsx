import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeContest, makeViewer } from '../../../test/fixtures';
import { renderWithProviders } from '../../../test/render';
import ContestView from './ContestView';

vi.mock('./grid/ContestGrid', () => ({ default: () => <div data-testid="grid" /> }));
vi.mock('./details/ContestDetails', () => ({ default: () => <div data-testid="details" /> }));
vi.mock('./scoreboard/QuarterStrip', () => ({ default: () => <div data-testid="quarters" /> }));
vi.mock('./sidebar/ActivityFeed', () => ({ default: () => <div data-testid="feed" /> }));
vi.mock('./details/ContestActionIcons', () => ({ default: () => <div data-testid="actions" /> }));

const renderView = (status: 'live' | 'reconnecting' = 'live') =>
  renderWithProviders(
    <ContestView
      contest={makeContest()}
      participants={[]}
      activity={[]}
      viewer={makeViewer()}
      status={status}
      winnerFlash={null}
      onStale={vi.fn()}
    />
  );

describe('ContestView', () => {
  it('lays out every section once under the contest name', () => {
    renderView();
    expect(screen.getByRole('heading', { level: 1, name: 'Test Bowl' })).toBeInTheDocument();
    ['grid', 'details', 'quarters', 'feed', 'actions'].forEach((id) =>
      expect(screen.getAllByTestId(id)).toHaveLength(1)
    );
  });

  it('shows the connection state when not live', () => {
    renderView('reconnecting');
    expect(screen.getByRole('status')).toHaveTextContent('Reconnecting…');
  });
});
