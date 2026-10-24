const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

// big counts read as 4.8K or 98.4B so scoreboard digits never outgrow their tile
export function formatCount(value: number): string {
  return Math.abs(value) < 1000 ? value.toLocaleString('en-US') : compact.format(value);
}
