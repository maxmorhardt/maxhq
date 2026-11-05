import { Groups, PersonAdd, School } from '@mui/icons-material';
import { Box, Button } from '@mui/material';
import { useState } from 'react';
import { Link } from 'react-router';
import type { Contest, Participant } from '../../../../types/contest';
import type { ContestViewer } from '../../live/viewer';
import InviteLinkDialog from './InviteLinkDialog';
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
  const [dialog, setDialog] = useState<'invite' | 'participants' | null>(null);
  const close = () => setDialog(null);

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1 }}>
        {viewer.isOwner && (
          <Button
            variant="contained"
            size="small"
            onClick={() => setDialog('invite')}
            startIcon={<PersonAdd />}
            sx={{ px: 1.5 }}
          >
            Invite
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
            Participants
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
        <InviteLinkDialog open={dialog === 'invite'} onClose={close} contest={contest} />
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
