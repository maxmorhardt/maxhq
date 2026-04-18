import { Groups, Link as LinkIcon, School } from '@mui/icons-material';
import { Box, IconButton, Tooltip } from '@mui/material';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import InviteManager from './InviteManager';
import ParticipantsManager from './ParticipantsManager';

interface ContestActionIconsProps {
  isOwner: boolean;
}

export default function ContestActionIcons({ isOwner }: ContestActionIconsProps) {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [participantsDialogOpen, setParticipantsDialogOpen] = useState(false);

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 1 }}>
        {isOwner && (
          <Tooltip title="Invite links">
            <IconButton
              onClick={() => setInviteDialogOpen(true)}
              size="small"
              sx={{
                color: 'rgba(255,255,255,0.6)',
                '&:hover': { color: '#f093fb' },
              }}
            >
              <LinkIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Participants">
          <IconButton
            onClick={() => setParticipantsDialogOpen(true)}
            size="small"
            sx={{
              color: 'rgba(255,255,255,0.6)',
              '&:hover': { color: '#43e97b' },
            }}
          >
            <Groups fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="How to play">
          <IconButton
            component={Link}
            to="/learn-more"
            size="small"
            sx={{
              color: 'rgba(255,255,255,0.6)',
              '&:hover': { color: 'white' },
            }}
          >
            <School fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {isOwner && (
        <InviteManager open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} />
      )}
      <ParticipantsManager
        open={participantsDialogOpen}
        onClose={() => setParticipantsDialogOpen(false)}
        isOwner={isOwner}
      />
    </>
  );
}
