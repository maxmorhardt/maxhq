import { Groups, Link as LinkIcon, School } from '@mui/icons-material';
import { Box, Button } from '@mui/material';
import { useState } from 'react';
import { Link } from 'react-router';
import type { Contest, Participant } from '../../../../types/contest';
import type { ContestViewer } from '../../live/viewer';
import InviteManager from './InviteManager';
import ParticipantsManager from './ParticipantsManager';

interface Props {
  contest: Contest;
  participants: Participant[];
  viewer: ContestViewer;
}

const actionSx = {
  minWidth: 0,
  px: { xs: 1, sm: 1.5 },
  color: 'text.secondary',
  borderColor: 'divider',
  '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.75 }, ml: 0 },
  '&:hover': { color: 'text.primary' },
};

const labelSx = { display: { xs: 'none', sm: 'inline' } };

export default function ContestActionIcons({ contest, participants, viewer }: Props) {
  const [dialog, setDialog] = useState<'invites' | 'participants' | null>(null);
  const close = () => setDialog(null);

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1 }}>
        {viewer.isOwner && (
          <Button
            variant="outlined"
            size="small"
            aria-label="Invite links"
            onClick={() => setDialog('invites')}
            startIcon={<LinkIcon />}
            sx={actionSx}
          >
            <Box component="span" sx={labelSx}>
              Invite
            </Box>
          </Button>
        )}
        <Button
          variant="outlined"
          size="small"
          aria-label="Participants"
          onClick={() => setDialog('participants')}
          startIcon={<Groups />}
          sx={actionSx}
        >
          <Box component="span" sx={labelSx}>
            Players
          </Box>
        </Button>
        <Button
          variant="outlined"
          size="small"
          aria-label="How to play"
          component={Link}
          to="/learn-more"
          startIcon={<School />}
          sx={actionSx}
        >
          <Box component="span" sx={labelSx}>
            Rules
          </Box>
        </Button>
      </Box>

      {viewer.isOwner && (
        <InviteManager open={dialog === 'invites'} onClose={close} contest={contest} />
      )}
      <ParticipantsManager
        open={dialog === 'participants'}
        onClose={close}
        contest={contest}
        participants={participants}
        viewer={viewer}
      />
    </>
  );
}
