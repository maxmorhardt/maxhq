import { Groups, Link as LinkIcon, School } from '@mui/icons-material';
import { Box, IconButton, Tooltip } from '@mui/material';
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

const iconSx = (hover: string) => ({ color: 'rgba(255,255,255,0.6)', '&:hover': { color: hover } });

export default function ContestActionIcons({ contest, participants, viewer }: Props) {
  const [dialog, setDialog] = useState<'invites' | 'participants' | null>(null);
  const close = () => setDialog(null);

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 1 }}>
        {viewer.isOwner && (
          <Tooltip title="Invite links">
            <IconButton
              aria-label="Invite links"
              onClick={() => setDialog('invites')}
              size="small"
              sx={iconSx('#f7c948')}
            >
              <LinkIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Participants">
          <IconButton
            aria-label="Participants"
            onClick={() => setDialog('participants')}
            size="small"
            sx={iconSx('#3ddc84')}
          >
            <Groups fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="How to play">
          <IconButton
            aria-label="How to play"
            component={Link}
            to="/learn-more"
            size="small"
            sx={iconSx('white')}
          >
            <School fontSize="small" />
          </IconButton>
        </Tooltip>
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
