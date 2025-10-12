export interface Contest {
  id: string;
  name: string;
  xLabels: number[];
  yLabels: number[];
  homeTeam?: string;
  awayTeam?: string;
  squares: Square[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface CreateContestRequest {
  name: string;
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

export interface ContestChannelResponse {
  type: string;
  contestId: string;
  squareId?: string;
  value?: string;
  xLabels?: number[];
  yLabels?: number[];
  updatedBy: string;
  timestamp: string;
}
