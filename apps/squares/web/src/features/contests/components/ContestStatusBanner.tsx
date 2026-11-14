import {
  Groups,
  HourglassEmpty,
  PersonAdd,
  TouchApp,
  VisibilityOutlined,
} from '@mui/icons-material';
import type { ReactNode } from 'react';
import { WATCHING_MESSAGE, type Contest, type Player } from '../../../types/contest';
import { isTerminalStatus } from '../../../utils/contestStatus';
import { plural } from '../../../utils/plural';
import type { ContestViewer } from '../live/viewer';
import ContestBanner, { type BannerAction } from './ContestBanner';
import type { ContestDialog } from './details/ContestDialogs';

interface Props {
  contest: Contest;
  players: Player[];
  viewer: ContestViewer;
  waiting: Player[];
  boardOpen: boolean;
  kickedOff: boolean;
  onOpen: (dialog: ContestDialog) => void;
}

interface Banner {
  icon: ReactNode;
  message: string;
  action?: BannerAction;
}

function bannerFor({
  contest,
  players,
  viewer,
  waiting,
  boardOpen,
  kickedOff,
  onOpen,
}: Props): Banner | null {
  if (isTerminalStatus(contest.status)) {
    return null;
  }
  if (!viewer.isOwner && !viewer.isPlayer) {
    return { icon: <VisibilityOutlined />, message: WATCHING_MESSAGE };
  }
  if (!boardOpen) {
    return null;
  }

  if (viewer.isOwner && !players.some((p) => p.role !== 'owner')) {
    return {
      icon: <PersonAdd />,
      message: 'Nobody has joined yet. Share your invite link with the group.',
      action: { label: 'Share Invite Link', icon: <PersonAdd />, onClick: () => onOpen('invite') },
    };
  }
  if (viewer.isOwner && waiting.length > 0) {
    return {
      icon: <Groups />,
      message:
        waiting.length === 1
          ? `${waiting[0].displayName} is waiting for squares.`
          : `${waiting.length} players are waiting for squares.`,
      action: { label: 'Give Squares', icon: <Groups />, onClick: () => onOpen('players') },
    };
  }

  if (viewer.squaresLeft > 0) {
    return {
      icon: <TouchApp />,
      message: `You have ${plural(viewer.squaresLeft, 'square')} left. ${
        kickedOff ? 'Pick them on the board.' : 'Pick them before kickoff.'
      }`,
    };
  }
  if (!viewer.isOwner && viewer.player?.maxSquares === 0) {
    return {
      icon: <HourglassEmpty />,
      message: 'You don’t have any squares yet. Ask the owner to give you some.',
    };
  }
  return null;
}

export default function ContestStatusBanner(props: Props) {
  const banner = bannerFor(props);
  return banner && <ContestBanner {...banner} />;
}
