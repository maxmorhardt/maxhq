import type { Contest, Player } from '../../../../types/contest';
import type { ContestViewer } from '../../live/viewer';
import InviteLinkDialog from './InviteLinkDialog';
import PlayersManager from './PlayersManager';

export type ContestDialog = 'invite' | 'players';

interface Props {
  open: ContestDialog | null;
  onOpen: (dialog: ContestDialog) => void;
  onClose: () => void;
  contest: Contest;
  players: Player[];
  viewer: ContestViewer;
}

export default function ContestDialogs({ open, onOpen, onClose, contest, players, viewer }: Props) {
  return (
    <>
      {viewer.isOwner && (
        <InviteLinkDialog open={open === 'invite'} onClose={onClose} contest={contest} />
      )}
      <PlayersManager
        open={open === 'players'}
        onClose={onClose}
        onInvite={() => onOpen('invite')}
        contest={contest}
        players={players}
        viewer={viewer}
      />
    </>
  );
}
