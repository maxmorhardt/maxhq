export interface Grid {
  id: string
  name: string
  xLabels: number[]
  yLabels: number[]
  cells: GridCell[]
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

export interface GridCell {
  id: string
  gridId: string
  row: number
  col: number
  value: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}