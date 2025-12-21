export type ContestStatus = 'ACTIVE' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FINISHED' | 'DELETED';

export interface Contest {
  id: string;
  name: string;
  xLabels: number[];
  yLabels: number[];
  homeTeam?: string;
  awayTeam?: string;
  status: ContestStatus;
  squares: Square[];
  quarterResults?: QuarterResult[];
  participants?: ContestParticipant[];
  owner: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface ContestParticipant {
  id: string;
  contestId: string;
  username: string;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
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
  ownerFirstName: string;
  ownerLastName: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface WSUpdate {
  type:
    | 'square_update'
    | 'contest_update'
    | 'quarter_result_update'
    | 'connected'
    | 'disconnected'
    | 'contest_deleted'
    | 'disconnect';
  contestId: string;
  connectionId?: string;
  updatedBy: string;
  timestamp: string;
  square?: SquareWSUpdate;
  contest?: ContestWSUpdate;
  quarterResult?: QuarterResultWSUpdate;
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
  status?: ContestStatus;
}

export interface QuarterResultWSUpdate {
  quarter: number;
  homeTeamScore: number;
  awayTeamScore: number;
  winnerRow: number;
  winnerCol: number;
  winner: string;
  winnerFirstName: string;
  winnerLastName: string;
  status: ContestStatus;
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

export interface QuarterResult {
  id: string;
  contestId: string;
  quarter: number;
  homeTeamScore: number;
  awayTeamScore: number;
  winnerRow: number;
  winnerCol: number;
  winner: string;
  winnerFirstName: string;
  winnerLastName: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface QuarterResultRequest {
  homeTeamScore: number;
  awayTeamScore: number;
}

export interface UpdateSquareRequest {
  value: string;
  owner: string;
}

export interface UpdateContestRequest {
  name?: string;
  homeTeam?: string;
  awayTeam?: string;
}

export interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactResponse {
  message: string;
}
