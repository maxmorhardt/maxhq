import { alpha } from '@mui/material/styles';
import { game as palette } from '../../../../app/theme';

// a selectable card in the create form; a blocked one stays visible but reads as unavailable
export const optionSx = (selected: boolean, blocked = false) =>
  ({
    position: 'relative',
    display: 'flex',
    textAlign: 'left',
    // ButtonBase centers its content, which shifts a card whose text is shorter than the card
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: 1.5,
    width: '100%',
    p: 1.75,
    borderRadius: '14px',
    border: 1,
    borderColor: selected ? 'primary.main' : 'divider',
    bgcolor: selected ? alpha(palette.brand, 0.1) : 'background.default',
    opacity: blocked ? 0.5 : 1,
    transition: 'border-color 160ms, background-color 160ms',
    '&:hover': {
      borderColor: selected ? 'primary.main' : blocked ? 'divider' : palette.lineStrong,
    },
  }) as const;
