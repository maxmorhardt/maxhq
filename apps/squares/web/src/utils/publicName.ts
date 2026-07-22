// mirrors the backend's leaderboard name formatting so the signed-in user's own
// profile name can be matched against the abbreviated names the API returns
export function toPublicName(displayName: string): string {
  const at = displayName.indexOf('@');
  const base = at >= 0 ? displayName.slice(0, at) : displayName;

  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'Player';
  }
  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

// identifies a leaderboard row uniquely enough to highlight, since tied players share a rank
export function leaderboardKey(rank: number, displayName: string): string {
  return `${rank}:${displayName}`;
}
