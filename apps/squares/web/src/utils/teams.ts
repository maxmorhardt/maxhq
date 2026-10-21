interface TeamColors {
  bg: string;
  fg: string;
}

const DARK_TEXT = '#0b1222';
const LIGHT_TEXT = '#ffffff';

// each team's primary color by ESPN abbreviation; light colors take dark text
const colors: Record<string, string> = {
  ARI: '#97233F',
  ATL: '#A71930',
  BAL: '#241773',
  BUF: '#00338D',
  CAR: '#0085CA',
  CHI: '#C83803',
  CIN: '#FB4F14',
  CLE: '#FF3C00',
  DAL: '#003594',
  DEN: '#FB4F14',
  DET: '#0076B6',
  GB: '#203731',
  HOU: '#03202F',
  IND: '#002C5F',
  JAX: '#006778',
  KC: '#E31837',
  LV: '#A5ACAF',
  LAC: '#0080C6',
  LAR: '#003594',
  MIA: '#008E97',
  MIN: '#4F2683',
  NE: '#002244',
  NO: '#D3BC8D',
  NYG: '#0B2265',
  NYJ: '#125740',
  PHI: '#004C54',
  PIT: '#FFB612',
  SF: '#AA0000',
  SEA: '#002244',
  TB: '#D50A0A',
  TEN: '#4B92DB',
  WSH: '#5A1414',
};

const lightBackgrounds = new Set(['LV', 'NO', 'PIT']);

const fallback: TeamColors = { bg: '#16223a', fg: LIGHT_TEXT };

export function teamColors(abbr?: string): TeamColors {
  const key = abbr?.toUpperCase() ?? '';
  const bg = colors[key];
  if (!bg) {
    return fallback;
  }
  return { bg, fg: lightBackgrounds.has(key) ? DARK_TEXT : LIGHT_TEXT };
}

// a short label for a team when the feed has no abbreviation, from its name
export function teamAbbr(abbr: string | undefined, name: string | undefined): string {
  if (abbr) {
    return abbr.toUpperCase();
  }
  return (
    (name ?? '?')
      .replace(/[^A-Za-z]/g, '')
      .slice(0, 3)
      .toUpperCase() || '?'
  );
}
