import { useMediaQuery } from '@mui/material';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeContest, makeViewer } from '../../../test/fixtures';
import { renderWithProviders } from '../../../test/render';
import ContestView from './ContestView';

vi.mock('@mui/material', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useMediaQuery: vi.fn(),
}));
vi.mock('./grid/ContestGrid', () => ({ default: () => <div data-testid="grid" /> }));
vi.mock('./details/ContestDetails', () => ({
  default: ({ fillHeight }: { fillHeight: boolean }) => (
    <div data-testid="details">{String(fillHeight)}</div>
  ),
}));
vi.mock('./sidebar/WinnersBoard', () => ({ default: () => <div data-testid="winners" /> }));
vi.mock('./sidebar/ActivityFeed', () => ({ default: () => <div data-testid="feed" /> }));

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
  beforeEach(() => {
    vi.mocked(useMediaQuery).mockReturnValue(true);
  });

  it('lays out every section once with the contest name', () => {
    renderView();
    expect(screen.getByRole('heading', { name: 'Test Bowl' })).toBeInTheDocument();
    ['grid', 'details', 'winners', 'feed'].forEach((id) =>
      expect(screen.getAllByTestId(id)).toHaveLength(1)
    );
  });

  it('stretches the details card only beside the grid', () => {
    renderView();
    expect(screen.getByTestId('details')).toHaveTextContent('true');
  });

  it('stacks the sections on small screens', () => {
    vi.mocked(useMediaQuery).mockReturnValue(false);
    renderView();
    expect(screen.getByTestId('details')).toHaveTextContent('false');
  });

  it('shows the connection state when not live', () => {
    renderView('reconnecting');
    expect(screen.getByRole('status')).toHaveTextContent('Reconnecting…');
  });
});
