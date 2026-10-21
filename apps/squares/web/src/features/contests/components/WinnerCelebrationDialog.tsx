import { Close, EmojiEvents } from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  keyframes,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { fonts, game } from '../../../app/theme';
import type { QuarterResult } from '../../../types/contest';

interface Props {
  result: QuarterResult | null;
  onClose: () => void;
}

const trophyRise = keyframes`
  from { opacity: 0; transform: translateY(12px) scale(0.85); }
  to { opacity: 1; transform: none; }
`;

export default function WinnerCelebrationDialog({ result, onClose }: Props) {
  return (
    <Dialog
      open={!!result}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            overflow: 'visible',
            borderColor: alpha(game.gold, 0.5),
            backgroundImage: `radial-gradient(80% 60% at 50% 0%, ${alpha(game.gold, 0.16)}, transparent 70%)`,
          },
        },
      }}
    >
      <IconButton
        aria-label="Close"
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: 'text.secondary',
          '&:hover': { color: 'text.primary' },
          zIndex: 1,
        }}
      >
        <Close />
      </IconButton>
      <DialogContent sx={{ textAlign: 'center', pt: 5, pb: 4, px: 3 }}>
        <Box
          sx={{
            width: 76,
            height: 76,
            borderRadius: '20px',
            bgcolor: game.gold,
            color: game.night,
            display: 'grid',
            placeItems: 'center',
            mx: 'auto',
            mb: 2.5,
            boxShadow: `0 16px 40px -12px ${alpha(game.gold, 0.7)}`,
            animation: `${trophyRise} 600ms cubic-bezier(0.34, 1.56, 0.64, 1) both`,
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          <EmojiEvents sx={{ fontSize: 40 }} />
        </Box>
        <Typography
          sx={{
            fontFamily: fonts.display,
            fontSize: '2.6rem',
            fontWeight: 800,
            lineHeight: 1,
            textTransform: 'uppercase',
            color: 'secondary.main',
            mb: 1.25,
          }}
        >
          You Won!
        </Typography>
        <Typography sx={{ fontSize: '1rem', color: 'text.secondary', mb: 0.5 }}>
          Your square ({result?.winnerCol}, {result?.winnerRow}) took Quarter {result?.quarter}
        </Typography>
        <Typography
          sx={{
            fontFamily: fonts.display,
            fontSize: '2.4rem',
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            color: 'text.primary',
            mt: 1.5,
            mb: 2.5,
          }}
        >
          {result?.homeTeamScore} &ndash; {result?.awayTeamScore}
        </Typography>
        <Button variant="contained" color="secondary" size="large" onClick={onClose}>
          Let&apos;s Go!
        </Button>
      </DialogContent>
    </Dialog>
  );
}
