import { BugReport, Info, SportsScore } from '@mui/icons-material';
import { Box, Button, Divider, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { selectCurrentContest } from '../../features/contests/contestSelectors';
import { startContestThunk, updateQuarterResult } from '../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { useToast } from '../../hooks/useToast';
import { updateSquareValueById } from '../../service/contestService';
import ContestSidebarCard from './ContestSidebarCard';

interface ContestDetailsProps {
  isOwner?: boolean;
}

const MAX_SCORE_LENGTH = 4;

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

  const contestStatus = currentContest.status;
  const totalSquares = currentContest.squares.length;
  const filledSquares = currentContest.squares.filter(
    (s) => s.value && s.value.trim() !== ''
  ).length;

  // calculate status flags
  const isCanceled = contestStatus === 'DELETED';
  const isFinished = contestStatus === 'FINISHED';
  const isActive = contestStatus === 'ACTIVE';
  const isInGame = ['Q1', 'Q2', 'Q3', 'Q4'].includes(contestStatus);
  const allSquaresFilled = filledSquares >= totalSquares;

  // determine which controls to show
  const showNoActions = isCanceled || isFinished;
  const showStartQ1Button = isActive && allSquaresFilled;
  const showScoreInputs = isInGame;

  const getStatusDisplay = () => {
    if (isCanceled) {
      return 'Deleted';
    } else if (isFinished) {
      return 'Finished';
    } else if (isInGame) {
      return `In Progress • ${contestStatus}`;
    }

    return `Active • ${filledSquares}/${totalSquares} Squares Filled`;
  };

  const handleScoreSubmit = async () => {
    if (!currentContest) {
      return;
    }

    const home = parseInt(homeScore);
    const away = parseInt(awayScore);

    // validate score inputs
    if (isNaN(home) || isNaN(away)) {
      return;
    }

    if (home < 0 || away < 0) {
      return;
    }

    try {
      // submit quarter result to backend
      await dispatch(
        updateQuarterResult({
          contestId: currentContest.id,
          request: {
            homeTeamScore: home,
            awayTeamScore: away,
          },
        })
      ).unwrap();

      showToast('Quarter score recorded successfully', 'success');

      // clear input fields after successful submit
      setHomeScore('');
      setAwayScore('');
    } catch (error) {
      console.error('Failed to record quarter result:', error);
    }
  };

  const handleStartQ1 = async () => {
    if (!currentContest || isStartingQ1) {
      return;
    }

    setIsStartingQ1(true);

    // call the startContest api which will transition from ACTIVE to Q1 and randomize labels
    try {
      await dispatch(startContestThunk(currentContest.id)).unwrap();
      showToast('Quarter 1 started!', 'success');
    } catch (error) {
      console.error('Failed to start Q1:', error);
    } finally {
      setIsStartingQ1(false);
    }
  };

  const handleAutoFill = async () => {
    if (!currentContest || isAutoFilling) {
      return;
    }

    setIsAutoFilling(true);
    showToast('Auto-filling squares...', 'info');

    // get all empty squares
    const emptySquares = currentContest.squares.filter((s) => !s.value || s.value.trim() === '');
    try {
      const owner = auth.user?.profile?.preferred_username || 'debug-user';
      const userName = auth.user?.profile?.name || auth.user?.profile?.preferred_username || 'User';

      // extract initials from user name
      const nameParts = userName.split(' ');
      const initials = nameParts.map((part) => part.charAt(0).toUpperCase()).join('');

      // fill each empty square with user initials
      for (const square of emptySquares) {
        await updateSquareValueById(currentContest.id, square.id, { value: initials, owner });
      }

      showToast(`Auto-filled ${emptySquares.length} squares!`, 'success');
    } catch (error) {
      console.error('Auto-fill error:', error);
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
        {/* status display visible to everyone */}
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

        {/* owner controls section */}
        {isOwner && (
          <>
            {/* no actions state */}
            {showNoActions && (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  No actions available
                </Typography>
              </Box>
            )}

            {/* active state start q1 button */}
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

            {/* active state waiting for squares */}
            {isActive && !allSquaresFilled && (
              <>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                {/* waiting message */}
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}
                >
                  Waiting for all squares to be filled before you can start the game.
                </Typography>

                {/* admin debug button */}
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
                    }}
                    fullWidth
                  >
                    {isAutoFilling ? 'Filling...' : 'Debug: Auto-fill All'}
                  </Button>
                )}
              </>
            )}

            {/* in-game state score inputs */}
            {showScoreInputs && (
              <>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                {/* section header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <SportsScore sx={{ color: '#43e97b', fontSize: '1.2rem' }} />

                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    Update Score
                  </Typography>
                </Box>

                {/* home team score input */}
                <TextField
                  label="Home Team Score"
                  type="number"
                  value={homeScore}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= MAX_SCORE_LENGTH) {
                      setHomeScore(value);
                    }
                  }}
                  size="small"
                  fullWidth
                  sx={{
                    '& input[type=number]': {
                      MozAppearance: 'textfield',
                    },
                    '& input[type=number]::-webkit-outer-spin-button': {
                      WebkitAppearance: 'none',
                      margin: 0,
                    },
                    '& input[type=number]::-webkit-inner-spin-button': {
                      WebkitAppearance: 'none',
                      margin: 0,
                    },
                  }}
                />

                {/* away team score input */}
                <TextField
                  label="Away Team Score"
                  type="number"
                  value={awayScore}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= MAX_SCORE_LENGTH) {
                      setAwayScore(value);
                    }
                  }}
                  size="small"
                  fullWidth
                  sx={{
                    '& input[type=number]': {
                      MozAppearance: 'textfield',
                    },
                    '& input[type=number]::-webkit-outer-spin-button': {
                      WebkitAppearance: 'none',
                      margin: 0,
                    },
                    '& input[type=number]::-webkit-inner-spin-button': {
                      WebkitAppearance: 'none',
                      margin: 0,
                    },
                  }}
                />

                {/* submit button */}
                <Button
                  variant="contained"
                  onClick={handleScoreSubmit}
                  disabled={!homeScore || !awayScore}
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
