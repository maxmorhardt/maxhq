import { Close } from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { selectCurrentContest } from '../../../features/contests/contestSelectors';
import { rollbackLastQuarterResult } from '../../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { useToast } from '../../../hooks/useToast';
import type { QuarterResult } from '../../../types/contest';
import ContestSidebarCard from './ContestSidebarCard';

const MAX_NAME_LENGTH = 20;

// a ghosted square (owner left a private contest) wins with no owner name
const GHOST_USER = 'ghost';

interface WinnersBoardProps {
  quarterResults?: QuarterResult[];
}

export default function WinnersBoard({ quarterResults = [] }: WinnersBoardProps) {
  const auth = useAuth();
  const dispatch = useAppDispatch();
  const currentContest = useAppSelector(selectCurrentContest);
  const { showToast } = useToast();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const getQuarterLabel = (quarter: number) => {
    return `Q${quarter}`;
  };

  const getSquareLabel = (result: QuarterResult) => {
    return `(${result.winnerRow}, ${result.winnerCol})`;
  };

  const formatWinnerName = (result: QuarterResult) => {
    const name = result.winner === GHOST_USER ? 'ghost' : result.winnerName;
    if (!name || name.length < MAX_NAME_LENGTH) {
      return name || '';
    }

    const truncatedNameLength = MAX_NAME_LENGTH - 3;
    return `${name.substring(0, truncatedNameLength)}...`;
  };

  // only the owner of a manual contest can undo the most recently recorded quarter
  const isOwner = !!auth.user?.profile?.email && auth.user.profile.email === currentContest?.owner;
  const isManual = !currentContest?.gameId;
  const canRollback =
    isOwner && isManual && currentContest?.status !== 'DELETED' && quarterResults.length > 0;

  const latestQuarter = quarterResults.length
    ? Math.max(...quarterResults.map((r) => r.quarter))
    : 0;

  const handleConfirmRollback = async () => {
    if (!currentContest) return;

    setIsRollingBack(true);
    try {
      await dispatch(rollbackLastQuarterResult({ contestId: currentContest.id })).unwrap();
      showToast(`Q${latestQuarter} result rolled back`, 'success');
      setConfirmOpen(false);
    } catch (error) {
      // failures surface through the global contest error toast
      console.error('Failed to roll back quarter result:', error);
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <ContestSidebarCard icon={<span style={{ fontSize: '1.3rem' }}>🏆</span>} title="Winners Board">
      {/* winners list */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {quarterResults.length > 0 ? (
          quarterResults.map((result) => {
            const showRollback = canRollback && result.quarter === latestQuarter;

            return (
              /* winner card */
              <Box
                key={result.id}
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '0.75rem',
                    px: 0.8,
                    py: 0.3,
                  }}
                >
                  <Typography
                    sx={{
                      color: '#43e97b',
                      fontWeight: 'bold',
                      fontSize: '0.7rem',
                    }}
                  >
                    {getQuarterLabel(result.quarter)}
                  </Typography>
                </Box>

                {/* winner info */}
                <Box sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                  <Typography
                    sx={{
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      fontSize: '0.8rem',
                    }}
                  >
                    {formatWinnerName(result)}
                  </Typography>

                  <Typography
                    variant="caption"
                    sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}
                  >
                    Square {getSquareLabel(result)}
                  </Typography>
                </Box>

                {/* rollback action on the latest winner, otherwise a spacer to keep alignment */}
                {showRollback ? (
                  <Box
                    sx={{ minWidth: 36, flexShrink: 0, display: 'flex', justifyContent: 'center' }}
                  >
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
                  </Box>
                ) : (
                  <Box sx={{ minWidth: 36, flexShrink: 0 }} />
                )}
              </Box>
            );
          })
        ) : (
          /* empty state */
          <Box
            sx={{
              textAlign: 'center',
              py: 3,
            }}
          >
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.6)',
                mb: 1,
              }}
            >
              No winners yet
            </Typography>

            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              Winners will appear here as the game progresses
            </Typography>
          </Box>
        )}
      </Box>

      {/* rollback confirmation */}
      <Dialog open={confirmOpen} onClose={() => !isRollingBack && setConfirmOpen(false)}>
        <DialogTitle>Roll back Q{latestQuarter} result?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This removes the recorded Q{latestQuarter} winner and reverts the contest to Q
            {latestQuarter} so you can re-enter the score. This can't be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={isRollingBack}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRollback}
            color="error"
            variant="contained"
            disabled={isRollingBack}
            startIcon={isRollingBack ? <CircularProgress size={16} color="inherit" /> : <Close />}
          >
            Roll Back
          </Button>
        </DialogActions>
      </Dialog>
    </ContestSidebarCard>
  );
}
