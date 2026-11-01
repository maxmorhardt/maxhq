// identifies a leaderboard row uniquely enough to highlight
export function leaderboardKey(rank: number, displayName: string): string {
  return `${rank}:${displayName}`;
}
