export type ContestStatus =
  | 'ACTIVE'
  | 'LOCKED'
  | 'Q1'
  | 'Q2'
  | 'Q3'
  | 'Q4'
  | 'FINISHED'
  | 'CANCELLED';

export interface Contest {
  id: string;
  name: string;
  xLabels: number[];
  yLabels: number[];
  homeTeam?: string;
  awayTeam?: string;
  status?: ContestStatus;
  squares: Square[];
  owner: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface CreateContestRequest {
  name: string;
  owner: string;
  homeTeam?: string;
  awayTeam?: string;
}

export interface Square {
  id: string;
  contestId: string;
  row: number;
  col: number;
  value: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export interface WSUpdate {
  type: 'square_update' | 'contest_update' | 'contest_deleted' | 'connected' | 'disconnect';
  contestId: string;
  connectionId: string;
  updatedBy: string;
  timestamp: string;
  square?: SquareWSUpdate;
  contest?: ContestWSUpdate;
}

export interface SquareWSUpdate {
  squareId: string;
  value: string;
}

export interface ContestWSUpdate {
  homeTeam?: string;
  awayTeam?: string;
  xLabels?: number[];
  yLabels?: number[];
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedContestsResponse {
  contests: Contest[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
