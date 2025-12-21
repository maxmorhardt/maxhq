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
    label: 'Active',
    description: 'Players can join and fill squares',
    color: '#4caf50',
  },
  {
    value: 'Q1',
    label: 'Quarter 1',
    description: 'First quarter in progress',
    color: '#2196f3',
  },
  {
    value: 'Q2',
    label: 'Quarter 2',
    description: 'Second quarter in progress',
    color: '#2196f3',
  },
  {
    value: 'Q3',
    label: 'Quarter 3',
    description: 'Third quarter in progress',
    color: '#2196f3',
  },
  {
    value: 'Q4',
    label: 'Quarter 4',
    description: 'Fourth quarter in progress',
    color: '#2196f3',
  },
  {
    value: 'FINISHED',
    label: 'Finished',
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

export function getStatusLabel(status: ContestStatus): string {
  return getStatusOption(status).label;
}
