import { Typography } from '@mui/material';
import { fonts } from '../../../app/theme';

interface Props {
  day: string;
  compact?: boolean;
}

export default function DayHeading({ day, compact = false }: Props) {
  return (
    <Typography
      component={compact ? 'h4' : 'h3'}
      sx={{
        mb: compact ? 1 : 1.5,
        fontFamily: fonts.display,
        fontWeight: 700,
        fontSize: compact ? '0.82rem' : '1rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'text.secondary',
      }}
    >
      {day}
    </Typography>
  );
}
