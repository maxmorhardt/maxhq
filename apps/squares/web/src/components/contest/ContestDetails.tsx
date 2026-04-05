import { Casino, Info, School, Share, SportsScore } from '@mui/icons-material';
import { Box, Button, Divider, IconButton, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { selectCurrentContest } from '../../features/contests/contestSelectors';
import { startContestThunk, updateQuarterResult } from '../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { useToast } from '../../hooks/useToast';
import ContestSidebarCard from './ContestSidebarCard';

interface ContestDetailsProps {
  isOwner?: boolean;
  onShare?: () => void;
  onRandomSquare?: () => void;
}

const MAX_SCORE_LENGTH = 4;

export default function ContestDetails({
  isOwner = false,
  onShare,
  onRandomSquare,
}: ContestDetailsProps) {
  const dispatch = useAppDispatch();
  const currentContest = useAppSelector(selectCurrentContest);
  const { showToast } = useToast();
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingQ1, setIsStartingQ1] = useState(false);

  if (!currentContest || !currentContest.squares) {
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

    setIsLoading(true);

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
      // toast handled by contest
      console.error('Failed to record quarter result:', error);
    } finally {
      setIsLoading(false);
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
      // toast handled by contest
      console.error('Failed to start Q1:', error);
    } finally {
      setIsStartingQ1(false);
    }
  };

  const hasEmptySquares = filledSquares < totalSquares;

  return (
    <ContestSidebarCard icon={<Info />} iconColor="#4facfe" title="Contest Details">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {/* status display visible to everyone */}
        <Box>
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 0.5, fontSize: '0.7rem' }}
          >
            Contest Status
          </Typography>

          <Typography
            variant="body2"
            sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500, fontSize: '0.8rem' }}
          >
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

                {/* randomly select a square button */}
                {hasEmptySquares && (
                  <Button
                    variant="outlined"
                    startIcon={<Casino />}
                    onClick={onRandomSquare}
                    size="small"
                    fullWidth
                  >
                    Randomly Select Square
                  </Button>
                )}
              </>
            )}

            {/* in-game state score inputs */}
            {showScoreInputs && (
              <>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                {/* section header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                  <SportsScore sx={{ color: '#43e97b', fontSize: '1rem' }} />

                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
                    Update Score
                  </Typography>
                </Box>

                {/* score inputs side by side */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    label={currentContest.homeTeam || 'Home'}
                    type="number"
                    value={homeScore}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= MAX_SCORE_LENGTH) {
                        setHomeScore(value);
                      }
                    }}
                    size="small"
                    sx={{
                      flex: 1,
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

                  <TextField
                    label={currentContest.awayTeam || 'Away'}
                    type="number"
                    value={awayScore}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= MAX_SCORE_LENGTH) {
                        setAwayScore(value);
                      }
                    }}
                    size="small"
                    sx={{
                      flex: 1,
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
                </Box>

                {/* submit button */}
                <Button
                  variant="contained"
                  onClick={handleScoreSubmit}
                  disabled={!homeScore || !awayScore || isLoading}
                  fullWidth
                  size="small"
                >
                  Update Score
                </Button>
              </>
            )}
          </>
        )}
      </Box>

      {/* share and learn more icons */}
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 1 }}>
        <IconButton
          onClick={onShare}
          size="small"
          sx={{
            color: 'rgba(255,255,255,0.6)',
            '&:hover': { color: 'white' },
          }}
          title="Share contest"
        >
          <Share fontSize="small" />
        </IconButton>
        <IconButton
          component={Link}
          to="/learn-more"
          size="small"
          sx={{
            color: 'rgba(255,255,255,0.6)',
            '&:hover': { color: 'white' },
          }}
          title="How to play"
        >
          <School fontSize="small" />
        </IconButton>
      </Box>
    </ContestSidebarCard>
  );
}
