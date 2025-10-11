export interface Contest {
  id: string;
  name: string;
  xLabels: number[];
  yLabels: number[];
  squares: Square[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
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
  squareId: string;
  value: string;
  updatedBy: string;
  timestamp: string;
}
