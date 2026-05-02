import { ErrorOutline, GridOff, HowToReg } from '@mui/icons-material';
import { Box, Button, Chip, Container, Paper, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { InvitePreviewResponse } from '../../types/contest';
import { gradients } from '../../types/gradients';

interface JoinNoSquaresProps {
  preview: InvitePreviewResponse | null;
}

export default function JoinNoSquares({ preview }: JoinNoSquaresProps) {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 8 }, px: { xs: 2, sm: 3 } }}>
      <Paper
        sx={{
          background: theme.palette.grey[900],
          border: `1px solid ${theme.palette.grey[800]}`,
          borderRadius: 3,
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
        }}
      >
        {/* icon */}
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(255,100,100,0.12)',
            border: '1px solid rgba(255,100,100,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <GridOff sx={{ fontSize: 28, color: '#ff6b6b' }} />
        </Box>

        {/* heading */}
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '1.4rem',
            mb: 1,
            background: gradients.textGradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          No Squares Available
        </Typography>

        {/* contest name chip */}
        {preview && (
          <Chip
            label={preview.contestName}
            size="small"
            sx={{
              mb: 2,
              bgcolor: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />
        )}

        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', mb: 3 }}>
          All available squares in this contest have already been allocated to participants.
        </Typography>

        {/* suggestions */}
        <Box
          sx={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 2,
            p: 2.5,
            textAlign: 'left',
            mb: 3,
          }}
        >
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.72rem',
              fontWeight: 600,
              mb: 1.5,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            What you can do
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <ErrorOutline sx={{ fontSize: 18, color: '#4facfe', mt: 0.1, flexShrink: 0 }} />
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                Ask{preview?.owner ? ` ${preview.owner}` : ' the contest owner'} to reduce another
                participant&apos;s square limit to free up space.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <HowToReg sx={{ fontSize: 18, color: '#4facfe', mt: 0.1, flexShrink: 0 }} />
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                Ask the owner for a <strong style={{ color: 'white' }}>viewer</strong> invite link
                so you can still follow along without claiming squares.
              </Typography>
            </Box>
          </Box>
        </Box>

        <Button
          variant="outlined"
          onClick={() => navigate('/contests')}
          sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.2)' }}
        >
          My Contests
        </Button>
      </Paper>
    </Container>
  );
}
