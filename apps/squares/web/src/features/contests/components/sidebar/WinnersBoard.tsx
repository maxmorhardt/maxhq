import { Close } from '@mui/icons-material';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { errorMessage } from '../../../../api/errors';
import ConfirmDialog from '../../../../components/feedback/ConfirmDialog';
import type { Contest, QuarterResult } from '../../../../types/contest';
import { useToast } from '../../../toast/useToast';
import { useRollbackQuarterResultMutation } from '../../api';
import { winnerLabel } from '../../live/activity';
import type { ContestViewer } from '../../live/viewer';
import ContestSidebarCard from './ContestSidebarCard';

const MAX_NAME_LENGTH = 20;

interface Props {
  contest: Contest;
  viewer: ContestViewer;
}

function formatWinnerName(result: QuarterResult) {
  const name = winnerLabel(result.winner, result.winnerName) || '';
  return name.length < MAX_NAME_LENGTH ? name : `${name.substring(0, MAX_NAME_LENGTH - 3)}...`;
}

export default function WinnersBoard({ contest, viewer }: Props) {
  const { showToast } = useToast();
  const [rollback, { isLoading, error, reset }] = useRollbackQuarterResultMutation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const results = contest.quarterResults ?? [];
  const latestQuarter = results.length ? Math.max(...results.map((r) => r.quarter)) : 0;

  // only the owner of a manual contest can undo the most recent quarter
  const canRollback =
    viewer.isOwner && !contest.gameId && contest.status !== 'DELETED' && results.length > 0;

  const closeConfirm = () => {
    reset();
    setConfirmOpen(false);
  };

  const handleRollback = async () => {
    try {
      await rollback(contest.id).unwrap();
      showToast(`Q${latestQuarter} result rolled back`, 'success');
      closeConfirm();
    } catch {
      // the error renders in the dialog
    }
  };

  return (
    <ContestSidebarCard icon={<span style={{ fontSize: '1.3rem' }}>🏆</span>} title="Winners Board">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {results.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', mb: 1 }}>No winners yet</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
              Winners will appear here as the game progresses
            </Typography>
          </Box>
        ) : (
          results.map((result) => (
            <Box
              key={result.id || result.quarter}
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 0.8,
                py: 0.5,
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 1,
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              {/* quarter badge */}
              <Box
                sx={{
                  borderRadius: 1,
                  background: 'rgba(67, 233, 123, 0.15)',
                  border: '1px solid rgba(67, 233, 123, 0.3)',
                  mr: 1.5,
                  px: 0.8,
                  py: 0.3,
                }}
              >
                <Typography sx={{ color: '#43e97b', fontWeight: 'bold', fontSize: '0.7rem' }}>
                  Q{result.quarter}
                </Typography>
              </Box>

              <Box sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                <Typography sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                  {formatWinnerName(result)}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}
                >
                  Square ({result.winnerRow}, {result.winnerCol})
                </Typography>
              </Box>

              {/* rollback sits on the latest winner; other rows keep the space for alignment */}
              <Box sx={{ minWidth: 36, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                {canRollback && result.quarter === latestQuarter && (
                  <Tooltip title="Undo this quarter's result">
                    <IconButton
                      aria-label={`Roll back Q${result.quarter} result`}
                      size="small"
                      onClick={() => setConfirmOpen(true)}
                      sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#ff5252' } }}
                    >
                      <Close sx={{ fontSize: '1rem' }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          ))
        )}
      </Box>

      <ConfirmDialog
        open={confirmOpen}
        title={`Roll back Q${latestQuarter} result?`}
        confirmLabel="Roll Back"
        onConfirm={handleRollback}
        onClose={closeConfirm}
        loading={isLoading}
        error={error ? errorMessage(error, 'Error rolling back quarter result') : null}
      >
        This removes the recorded Q{latestQuarter} winner and reverts the contest to Q
        {latestQuarter} so you can re-enter the score. This can't be undone.
      </ConfirmDialog>
    </ContestSidebarCard>
  );
}
