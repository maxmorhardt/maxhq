import type { ContestStatus } from '../types/contest';

export interface StatusOption {
  value: ContestStatus;
  label: string;
  description: string;
  color: string;
}

export const statusOptions: StatusOption[] = [
  {
    value: 'ACTIVE',
    label: 'Open',
    description: 'Players can join and fill squares',
    color: '#4caf50',
  },
  {
    value: 'Q1',
    label: 'Q1',
    description: 'First quarter in progress',
    color: '#2196f3',
  },
  {
    value: 'Q2',
    label: 'Q2',
    description: 'Second quarter in progress',
    color: '#2196f3',
  },
  {
    value: 'Q3',
    label: 'Q3',
    description: 'Third quarter in progress',
    color: '#2196f3',
  },
  {
    value: 'Q4',
    label: 'Q4',
    description: 'Fourth quarter in progress',
    color: '#2196f3',
  },
  {
    value: 'FINISHED',
    label: 'Final',
    description: 'Contest is complete',
    color: '#9e9e9e',
  },
  {
    value: 'DELETED',
    label: 'Deleted',
    description: 'Contest has been deleted',
    color: '#f92f21ff',
  },
];

export function getStatusOption(status: ContestStatus): StatusOption {
  if (!status) {
    return statusOptions[0];
  }

  const option = statusOptions.find((opt) => opt.value === status);
  return option || statusOptions[0];
}

// an open contest reads as its kickoff and a live one as the game's quarter, like a scoreboard does
export function getStatusLabel(
  status: ContestStatus,
  gameTime?: string,
  gamePeriod?: number
): string {
  const kickoff = gameTime ? new Date(gameTime) : undefined;
  if (status === 'ACTIVE' && kickoff && kickoff.getTime() > Date.now()) {
    const day = kickoff.toLocaleDateString(undefined, { weekday: 'short' });
    const time = kickoff.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${day} ${time}`;
  }
  if (isInGameStatus(status) && gamePeriod) {
    // the second quarter pays out when halftime starts, moving the contest on to Q3 early
    if (status === 'Q3' && gamePeriod === 2) {
      return 'Halftime';
    }
    return gamePeriod > 4 ? 'OT' : `Q${gamePeriod}`;
  }
  return getStatusOption(status).label;
}

const inGameStatuses: ContestStatus[] = ['Q1', 'Q2', 'Q3', 'Q4'];

export function isInGameStatus(status: ContestStatus | undefined | null): boolean {
  return !!status && inGameStatuses.includes(status);
}

export function isTerminalStatus(status: ContestStatus | undefined | null): boolean {
  return status === 'FINISHED' || status === 'DELETED';
}
