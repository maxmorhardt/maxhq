import { BugReport, Info, SportsScore } from '@mui/icons-material';
import { Box, Button, Divider, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { selectCurrentContest } from '../../features/contests/contestSelectors';
import { startContestThunk } from '../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { useToast } from '../../hooks/useToast';
import { updateSquareValueById } from '../../service/contestService';
import ContestSidebarCard from './ContestSidebarCard';

interface ContestDetailsProps {
  isOwner?: boolean;
}

export default function ContestDetails({ isOwner = false }: ContestDetailsProps) {
  const auth = useAuth();
  const dispatch = useAppDispatch();
  const currentContest = useAppSelector(selectCurrentContest);
  const { showToast } = useToast();
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [isStartingQ1, setIsStartingQ1] = useState(false);

  if (!currentContest) {
    return;
  }

  const contestStatus = currentContest.status || 'ACTIVE';
  const totalSquares = currentContest.squares.length;
  const filledSquares = currentContest.squares.filter(
    (s) => s.value && s.value.trim() !== ''
  ).length;

  const isCanceled = contestStatus === 'DELETED';
  const isFinished = contestStatus === 'FINISHED';
  const isActive = contestStatus === 'ACTIVE';
  const isInGame = ['Q1', 'Q2', 'Q3', 'Q4'].includes(contestStatus);
  const allSquaresFilled = filledSquares >= totalSquares;

  const showNoActions = isCanceled || isFinished;
  const showStartQ1Button = isActive && allSquaresFilled;
  const showScoreInputs = isInGame;

  const getStatusDisplay = () => {
    if (isCanceled) return 'Deleted';
    if (isFinished) return 'Finished';
    if (isInGame) return `In Progress • ${contestStatus}`;
    return `Active • ${filledSquares}/${totalSquares} Squares Filled`;
  };

  const handleScoreSubmit = () => {
    const home = parseInt(homeScore, 10);
    const away = parseInt(awayScore, 10);

    if (isNaN(home) || isNaN(away)) {
      showToast('Please enter valid scores', 'error');
      return;
    }

    if (home < 0 || away < 0) {
      showToast('Scores cannot be negative', 'error');
      return;
    }

    // TODO: Dispatch action to update scores
    showToast(`Score update: ${home}-${away} (coming soon)`, 'info');
  };

  const handleStartQ1 = async () => {
    if (!currentContest || isStartingQ1) return;

    setIsStartingQ1(true);

    try {
      // Call the startContest API which will transition from ACTIVE to Q1 and randomize labels
      await dispatch(startContestThunk(currentContest.id)).unwrap();

      showToast('Quarter 1 started!', 'success');
    } catch (error) {
      console.error('Failed to start Q1:', error);
      showToast('Failed to start Quarter 1', 'error');
    } finally {
      setIsStartingQ1(false);
    }
  };

  const handleAutoFill = async () => {
    if (!currentContest || isAutoFilling) return;

    setIsAutoFilling(true);
    showToast('Auto-filling squares...', 'info');

    const emptySquares = currentContest.squares.filter((s) => !s.value || s.value.trim() === '');

    try {
      const owner = auth.user?.profile?.preferred_username || 'debug-user';
      const userName = auth.user?.profile?.name || auth.user?.profile?.preferred_username || 'User';

      // Get initials from the user's name
      const nameParts = userName.split(' ');
      const initials = nameParts.map((part) => part.charAt(0).toUpperCase()).join('');

      for (let i = 0; i < emptySquares.length; i++) {
        const square = emptySquares[i];

        await updateSquareValueById(currentContest.id, square.id, { value: initials, owner });

        // Small delay to avoid overwhelming the server
        if (i % 10 === 9) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      showToast(`Auto-filled ${emptySquares.length} squares!`, 'success');
    } catch (error) {
      console.error('Auto-fill error:', error);
      showToast('Failed to auto-fill squares', 'error');
    } finally {
      setIsAutoFilling(false);
    }
  };

  const userGroups = (auth.user?.profile?.groups as string[] | undefined) || [];
  const isAdmin = userGroups.includes('/Squares_Admin');
  const canAutoFill = isAdmin;

  return (
    <ContestSidebarCard icon={<Info />} iconColor="#4facfe" title="Contest Details">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Status Display - Visible to Everyone */}
        <Box>
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1 }}
          >
            Contest Status
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
            {getStatusDisplay()}
          </Typography>
        </Box>

        {/* Owner Controls Section */}
        {isOwner && (
          <>
            {/* No Actions State */}
            {showNoActions && (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  No actions available
                </Typography>
              </Box>
            )}

            {/* Active State - Start Q1 Button */}
            {showStartQ1Button && (
              <>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <Button
                  variant="contained"
                  startIcon={<SportsScore />}
                  onClick={handleStartQ1}
                  disabled={isStartingQ1}
                  fullWidth
                >
                  {isStartingQ1 ? 'Starting...' : 'Start Quarter 1'}
                </Button>
                <Typography
                  variant="caption"
                  sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}
                >
                  Start the game and begin Quarter 1.
                </Typography>
              </>
            )}

            {/* Active State - Waiting for Squares */}
            {isActive && !allSquaresFilled && (
              <>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}
                >
                  Waiting for all squares to be filled before you can start the game.
                </Typography>
                {canAutoFill && (
                  <Button
                    variant="outlined"
                    startIcon={<BugReport />}
                    onClick={handleAutoFill}
                    disabled={isAutoFilling}
                    size="small"
                    sx={{
                      borderColor: 'rgba(255, 193, 7, 0.5)',
                      color: '#ffc107',
                      '&:hover': {
                        borderColor: '#ffc107',
                        background: 'rgba(255, 193, 7, 0.1)',
                      },
                      '&:disabled': {
                        borderColor: 'rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.3)',
                      },
                    }}
                    fullWidth
                  >
                    {isAutoFilling ? 'Filling...' : 'Debug: Auto-fill All'}
                  </Button>
                )}
              </>
            )}

            {/* In-Game State - Score Inputs */}
            {showScoreInputs && (
              <>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <SportsScore sx={{ color: '#43e97b', fontSize: '1.2rem' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    Update Score
                  </Typography>
                </Box>
                <TextField
                  label="Home Team Score"
                  type="number"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                    },
                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                  }}
                />
                <TextField
                  label="Away Team Score"
                  type="number"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                    },
                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleScoreSubmit}
                  disabled={!homeScore || !awayScore}
                  sx={{
                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    color: 'rgba(0,0,0,0.87)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #38f9d7 0%, #43e97b 100%)',
                    },
                    '&:disabled': {
                      background: 'rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.3)',
                    },
                  }}
                  fullWidth
                >
                  Update Score
                </Button>
              </>
            )}
          </>
        )}
      </Box>
    </ContestSidebarCard>
  );
}
