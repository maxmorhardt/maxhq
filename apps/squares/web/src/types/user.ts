export interface UserProfile {
  email: string;
  displayName: string;
  defaultInitials: string;
  createdAt: string;
}

export interface UpdateUserProfileRequest {
  defaultInitials: string;
}

export interface UserStats {
  contestsCreated: number;
  contestsJoined: number;
  squaresClaimed: number;
  quarterWins: number;
  quartersPlayed: number;
}

export interface UserActiveContest {
  id: string;
  name: string;
  owner: string;
  role: 'owner' | 'participant';
}
