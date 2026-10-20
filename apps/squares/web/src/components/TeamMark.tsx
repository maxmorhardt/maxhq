import { Box } from '@mui/material';
import { fonts } from '../app/theme';
import { teamAbbr, teamColors } from '../utils/teams';

interface Props {
  abbr?: string;
  name?: string;
  size?: number;
}

// a team's abbreviation on its own color, the way broadcast graphics badge teams
export default function TeamMark({ abbr, name, size = 40 }: Props) {
  const label = teamAbbr(abbr, name);
  const { bg, fg } = teamColors(abbr);

  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        flexShrink: 0,
        display: 'inline-grid',
        placeItems: 'center',
        width: size,
        height: size,
        borderRadius: `${Math.round(size * 0.28)}px`,
        bgcolor: bg,
        color: fg,
        border: '1px solid rgba(255, 255, 255, 0.12)',
        fontFamily: fonts.display,
        fontWeight: 800,
        fontSize: size * (label.length > 2 ? 0.34 : 0.4),
        letterSpacing: '0.02em',
        lineHeight: 1,
      }}
    >
      {label}
    </Box>
  );
}
