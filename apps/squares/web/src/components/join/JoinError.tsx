import { GridOff, HelpOutlineOutlined, HowToReg, LinkOff } from '@mui/icons-material';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ErrorState, { type ErrorStateHint } from '../common/ErrorState';
import type { InvitePreviewResponse } from '../../types/contest';
import { gradients } from '../../types/gradients';

type JoinErrorVariant = 'error' | 'no-squares';

interface JoinErrorProps {
  variant: JoinErrorVariant;
  message?: string;
  preview?: InvitePreviewResponse | null;
}

export default function JoinError({ variant, message, preview }: JoinErrorProps) {
  const navigate = useNavigate();

  const noSquares = variant === 'no-squares';

  const hints: ErrorStateHint[] = noSquares
    ? [
        {
          icon: HowToReg,
          text: (
            <>
              Ask{preview?.owner ? ` ${preview.owner}` : ' the contest owner'} to lower another
              participant&apos;s square limit to free up space.
            </>
          ),
        },
        {
          icon: HelpOutlineOutlined,
          text: (
            <>
              Or ask for a <strong style={{ color: 'white' }}>viewer</strong> invite so you can
              still follow along without claiming squares.
            </>
          ),
        },
      ]
    : [
        {
          icon: HelpOutlineOutlined,
          text: 'Invite links can expire or hit a use limit. Ask whoever invited you to send a fresh one.',
        },
      ];

  return (
    <ErrorState
      icon={noSquares ? GridOff : LinkOff}
      accent={noSquares ? gradients.primary : '#ff6b6b'}
      label={noSquares ? 'Contest Full' : 'Invite Link'}
      title={noSquares ? 'No Squares Available' : 'Unable to Join'}
      description={
        noSquares ? (
          <>
            Every square in{' '}
            <Box component="span" sx={{ color: 'white', fontWeight: 600 }}>
              {preview?.contestName ?? 'this contest'}
            </Box>{' '}
            has already been claimed.
          </>
        ) : (
          (message ?? 'This invite link is invalid or expired')
        )
      }
      hints={hints}
      actions={[{ label: 'My Contests', onClick: () => navigate('/contests') }]}
    />
  );
}
