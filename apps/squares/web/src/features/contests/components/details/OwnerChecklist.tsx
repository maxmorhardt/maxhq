import { Check, Groups, PersonAdd } from '@mui/icons-material';
import { Box, Button, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { fonts, game as palette } from '../../../../app/theme';
import type { Contest, Player } from '../../../../types/contest';
import { getOwnerTodo, getSquarePool, type OwnerTodo } from '../../live/viewer';
import type { ContestDialog } from './ContestDialogs';

interface Props {
  contest: Contest;
  players: Player[];
  onOpen: (dialog: ContestDialog) => void;
}

const STEPS: { todo: OwnerTodo; label: string }[] = [
  { todo: 'invite', label: 'Invite players' },
  { todo: 'squares', label: 'Give out squares' },
];

const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;

function squaresMessage(contest: Contest, players: Player[]): string {
  const { unallocated, waiting } = getSquarePool(contest, players);
  if (waiting.length === 0) {
    return `${unallocated} ${unallocated === 1 ? 'square isn’t' : 'squares aren’t'} given to anyone yet, so the board can’t fill.`;
  }
  const who =
    waiting.length === 1 ? `${waiting[0].displayName} is` : `${waiting.length} players are`;
  return unallocated > 0
    ? `${who} waiting for squares.`
    : `${who} waiting for squares. Lower someone’s squares to make room.`;
}

export default function OwnerChecklist({ contest, players, onOpen }: Props) {
  const todo = getOwnerTodo(contest, players);
  if (!todo) {
    return null;
  }

  const current = STEPS.findIndex((s) => s.todo === todo);
  const action =
    todo === 'invite'
      ? {
          message:
            'Share your invite link with the group. Everyone joins with no squares, and you hand them out.',
          label: 'Share Invite Link',
          icon: <PersonAdd />,
          dialog: 'invite' as const,
        }
      : {
          message: squaresMessage(contest, players),
          label: 'Give Squares',
          icon: <Groups />,
          dialog: 'players' as const,
        };

  return (
    <Box
      component="section"
      aria-label="Board setup"
      sx={{
        borderRadius: '14px',
        border: 1,
        borderColor: alpha(palette.brand, 0.45),
        bgcolor: alpha(palette.brand, 0.06),
        px: { xs: 1.75, sm: 2 },
        py: 1.5,
      }}
    >
      <Box
        component="ol"
        sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        {STEPS.map((step, i) => {
          const done = i < current;
          const isCurrent = i === current;
          return (
            <Box
              component="li"
              key={step.todo}
              aria-current={isCurrent ? 'step' : undefined}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                minWidth: 0,
                ...(i > 0 && {
                  '&::before': {
                    content: '""',
                    width: { xs: 16, sm: 32 },
                    height: '1px',
                    mr: 0.25,
                    bgcolor: 'divider',
                  },
                }),
              }}
            >
              <Box
                aria-hidden
                sx={{
                  width: 22,
                  height: 22,
                  flexShrink: 0,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: fonts.display,
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  border: 1.5,
                  borderColor: done ? palette.go : isCurrent ? palette.brand : 'divider',
                  bgcolor: done
                    ? alpha(palette.go, 0.15)
                    : isCurrent
                      ? palette.brand
                      : 'transparent',
                  color: done ? palette.go : isCurrent ? 'primary.contrastText' : 'text.secondary',
                }}
              >
                {done ? <Check sx={{ fontSize: '0.85rem' }} /> : i + 1}
              </Box>
              <Typography
                noWrap
                sx={{
                  fontSize: '0.85rem',
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? 'text.primary' : 'text.secondary',
                }}
              >
                {step.label}
                {done && (
                  <Box component="span" sx={visuallyHidden}>
                    {' '}
                    (done)
                  </Box>
                )}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          mt: 1.25,
        }}
      >
        <Typography sx={{ flex: '1 1 240px', fontSize: '0.9rem', lineHeight: 1.45 }}>
          {action.message}
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={action.icon}
          onClick={() => onOpen(action.dialog)}
          sx={{ whiteSpace: 'nowrap' }}
        >
          {action.label}
        </Button>
      </Box>
    </Box>
  );
}
