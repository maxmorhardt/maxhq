import {
  Groups,
  HourglassEmpty,
  PersonAdd,
  TouchApp,
  VisibilityOutlined,
} from '@mui/icons-material';
import { WATCHING_MESSAGE, type Contest, type Player } from '../../../types/contest';
import { isTerminalStatus } from '../../../utils/contestStatus';
import { plural } from '../../../utils/plural';
import type { ContestViewer, SquarePool } from '../live/viewer';
import ContestBanner, { type ContestBannerProps } from './ContestBanner';
import type { ContestDialog } from './details/ContestDialogs';

interface Props {
  contest: Contest;
  players: Player[];
  viewer: ContestViewer;
  pool: SquarePool;
  boardOpen: boolean;
  beforeKickoff: boolean;
  removed: boolean;
  onOpen: (dialog: ContestDialog) => void;
}

function waitingMessage({ waiting, unallocated }: SquarePool): string {
  const who =
    waiting.length === 1 ? `${waiting[0].displayName} is` : `${waiting.length} players are`;
  return unallocated > 0
    ? `${who} waiting for squares.`
    : `${who} waiting. Lower someone’s squares to make room.`;
}

function bannerFor({
  contest,
  players,
  viewer,
  pool,
  boardOpen,
  beforeKickoff,
  removed,
  onOpen,
}: Props): ContestBannerProps | null {
  if (isTerminalStatus(contest.status)) {
    return null;
  }
  if (!viewer.isOwner && !viewer.isPlayer) {
    return {
      icon: <VisibilityOutlined />,
      message: boardOpen && !removed ? WATCHING_MESSAGE : 'You’re watching this contest.',
    };
  }

  const active = contest.status === 'ACTIVE';
  if (viewer.isOwner && boardOpen && !players.some((p) => p.role !== 'owner')) {
    return {
      icon: <PersonAdd />,
      message: 'Nobody has joined yet. Share your invite link with the group.',
      action: { label: 'Share Invite Link', icon: <PersonAdd />, onClick: () => onOpen('invite') },
    };
  }
  if (viewer.isOwner && active && pool.waiting.length > 0) {
    return {
      icon: <Groups />,
      message: waitingMessage(pool),
      action: {
        label: pool.unallocated > 0 ? 'Give Squares' : 'Manage Players',
        icon: <Groups />,
        onClick: () => onOpen('players'),
      },
    };
  }

  if (boardOpen && viewer.squaresLeft > 0) {
    return {
      icon: <TouchApp />,
      message: `You have ${plural(viewer.squaresLeft, 'square')} left. ${
        beforeKickoff ? 'Pick them before kickoff.' : 'Tap open squares on the board to claim them.'
      }`,
    };
  }
  if (!viewer.isOwner && active && viewer.player?.maxSquares === 0) {
    return {
      icon: <HourglassEmpty />,
      message: boardOpen
        ? 'You don’t have any squares yet. Ask the owner to give you some.'
        : 'The board is full. Watch the game, or ask the owner to open up a spot.',
    };
  }
  return null;
}

export default function ContestStatusBanner(props: Props) {
  const banner = bannerFor(props);
  return banner && <ContestBanner {...banner} />;
}
