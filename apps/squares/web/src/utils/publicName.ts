// mirror the backend's name abbreviation so leaderboard rows can be matched
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

// what other players see for a participant: a shortened name, never their email
export function participantName(participant: { displayName?: string }): string {
  const name = participant.displayName?.trim();
  return name && !name.includes('@') ? toPublicName(name) : 'A player';
}

// identifies a leaderboard row uniquely enough to highlight, since tied players share a rank
export function leaderboardKey(rank: number, displayName: string): string {
  return `${rank}:${displayName}`;
}
