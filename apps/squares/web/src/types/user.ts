export interface UserProfile {
  email: string;
  displayName: string;
  createdAt: string;
}

export interface UserStats {
  contestsCreated: number;
  contestsJoined: number;
  squaresClaimed: number;
  quarterWins: number;
}

export interface UserActiveContest {
  id: string;
  name: string;
  owner: string;
  role: 'owner' | 'participant';
}
