import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeContest, makeViewer } from '../../../test/fixtures';
import { renderWithProviders } from '../../../test/render';
import type { Contest } from '../../../types/contest';
import type { ContestViewer } from '../live/viewer';
import WatchingBanner from './WatchingBanner';

const spectator = makeViewer({ isParticipant: false, participant: undefined, squaresLeft: 0 });

const renderBanner = (
  viewer: ContestViewer,
  contest: Contest = makeContest({ visibility: 'public' })
) => renderWithProviders(<WatchingBanner contest={contest} viewer={viewer} />);

describe('WatchingBanner', () => {
  it('tells someone watching a public contest how to play', () => {
    renderBanner(spectator);
    expect(screen.getByRole('status')).toHaveTextContent(
      "You're watching this contest. Ask the owner for the invite link to play."
    );
  });

  it('stays out of the way of participants and the owner', () => {
    renderBanner(makeViewer());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    renderBanner(makeViewer({ isOwner: true, isParticipant: false }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('goes away once the contest is over', () => {
    renderBanner(spectator, makeContest({ visibility: 'public', status: 'FINISHED' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
