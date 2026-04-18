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

interface WinnerDialogData {
  quarter: number;
  homeScore: number;
  awayScore: number;
  row: number;
  col: number;
}

interface WinnerCelebrationDialogProps {
  data: WinnerDialogData | null;
  onClose: () => void;
}

export default function WinnerCelebrationDialog({ data, onClose }: WinnerCelebrationDialogProps) {
  return (
    <Dialog
      open={!!data}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            background: 'linear-gradient(135deg, rgba(20,20,30,0.97) 0%, rgba(15,40,25,0.97) 100%)',
            border: '1px solid rgba(67, 233, 123, 0.3)',
            borderRadius: 3,
            overflow: 'visible',
          },
        },
      }}
    >
      <IconButton
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: 'rgba(255,255,255,0.5)',
          '&:hover': { color: 'white' },
          zIndex: 1,
        }}
      >
        <Close />
      </IconButton>
      <DialogContent sx={{ textAlign: 'center', pt: 5, pb: 4, px: 3 }}>
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background:
              'linear-gradient(135deg, rgba(67,233,123,0.25) 0%, rgba(67,233,123,0.1) 100%)',
            border: '2px solid rgba(67,233,123,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2.5,
            animation: `${keyframes`
              0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(67,233,123,0.2); }
              50% { transform: scale(1.08); box-shadow: 0 0 32px rgba(67,233,123,0.4); }
            `} 2s ease-in-out infinite`,
          }}
        >
          <EmojiEvents sx={{ fontSize: 36, color: '#ffd700' }} />
        </Box>
        <Typography
          sx={{
            fontSize: '1.6rem',
            fontWeight: 800,
            mb: 1,
            background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          You Won!
        </Typography>
        <Typography sx={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)', mb: 0.5 }}>
          Your square ({data?.col}, {data?.row}) took Quarter {data?.quarter}
        </Typography>
        <Typography
          sx={{
            fontSize: '1.8rem',
            fontWeight: 700,
            color: 'white',
            mt: 1.5,
            mb: 2,
            letterSpacing: 2,
          }}
        >
          {data?.homeScore} &ndash; {data?.awayScore}
        </Typography>
        <Button
          variant="contained"
          onClick={onClose}
          sx={{
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            color: '#0a0a0a',
            fontWeight: 700,
            px: 4,
            py: 1,
            borderRadius: 2,
            fontSize: '0.95rem',
            '&:hover': {
              background: 'linear-gradient(135deg, #38f9d7 0%, #43e97b 100%)',
            },
          }}
        >
          Let's Go!
        </Button>
      </DialogContent>
    </Dialog>
  );
}
