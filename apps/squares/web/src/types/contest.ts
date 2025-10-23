export interface Contest {
  id: string;
  name: string;
  xLabels: number[];
  yLabels: number[];
  homeTeam?: string;
  awayTeam?: string;
  squares: Square[];
  ownerId: string;
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
  type: string;
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
