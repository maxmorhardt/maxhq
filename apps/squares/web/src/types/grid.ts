export interface Grid {
  id: string;
  name: string;
  xLabels: number[];
  yLabels: number[];
  cells: GridCell[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface GridCell {
  id: string;
  gridId: string;
  row: number;
  col: number;
  value: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export interface GridChannelResponse {
  type: string;
  gridId: string;
  cellId: string;
  value: string;
  updatedBy: string;
  timestamp: string;
}
