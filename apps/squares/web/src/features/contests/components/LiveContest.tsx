import { skipToken } from '@reduxjs/toolkit/query';
import { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router';
import { useAppSelector } from '../../../app/hooks';
import ForbiddenError from '../../../components/errors/ForbiddenError';
import NotFoundError from '../../../components/errors/NotFoundError';
import type { QuarterResult } from '../../../types/contest';
import { useGetGameQuery } from '../../games/api';
import { useGameStream } from '../../games/useGameStream';
import { useToast } from '../../toast/useToast';
import type { ContestEvent } from '../live/events';
import {
  selectLiveActivity,
  selectLiveContest,
  selectLiveParticipants,
  selectStreamEnd,
  selectStreamStatus,
} from '../live/selectors';
import { useContestStream } from '../live/useContestStream';
import { getContestViewer } from '../live/viewer';
import ContestError from './ContestError';
import ContestPageSkeleton from './ContestPageSkeleton';
import ContestView from './ContestView';
import type { SquarePosition } from './grid/ContestGrid';
import WinnerCelebrationDialog from './WinnerCelebrationDialog';

const WINNER_FLASH_MS = 2000;

interface Props {
  contestId: string;
}

// owns the live connection for one contest: keeps the store in sync and reacts to what happens
export default function LiveContest({ contestId }: Props) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const email = useAuth().user?.profile?.email;

  const contest = useAppSelector(selectLiveContest);
  const participants = useAppSelector(selectLiveParticipants);
  const activity = useAppSelector(selectLiveActivity);
  const status = useAppSelector(selectStreamStatus);
  const ended = useAppSelector(selectStreamEnd);

  const [winnerFlash, setWinnerFlash] = useState<SquarePosition | null>(null);
  const [celebration, setCelebration] = useState<QuarterResult | null>(null);

  const onEvent = (event: ContestEvent) => {
    switch (event.type) {
      case 'contest.deleted':
        showToast('Contest has been deleted', 'warning');
        navigate('/contests');
        break;
      case 'quarter.recorded':
        setWinnerFlash({ row: event.data.winnerRow, col: event.data.winnerCol });
        if (event.data.winner === email) {
          setCelebration(event.data);
        }
        break;
      case 'participant.removed': {
        if (event.data.userId !== email) {
          break;
        }
        // a private contest is off-limits once removed; a public one stays viewable
        const isPrivate = contest?.visibility === 'private';
        showToast('You have been removed from this contest', isPrivate ? 'warning' : 'info');
        if (isPrivate) {
          navigate('/contests');
        }
        break;
      }
    }
  };

  const { resync } = useContestStream(contestId, onEvent);

  // the score comes from the games service; the contest stream only carries the contest
  const gameId = contest?.gameId;
  const { data: game } = useGetGameQuery(gameId ?? skipToken);
  useGameStream(gameId);

  useEffect(() => {
    if (!winnerFlash) {
      return;
    }
    const timer = setTimeout(() => setWinnerFlash(null), WINNER_FLASH_MS);
    return () => clearTimeout(timer);
  }, [winnerFlash]);

  if (ended === 'forbidden' || ended === 'revoked') {
    return <ForbiddenError />;
  }

  if (ended === 'not_found') {
    return <NotFoundError />;
  }

  if (!contest) {
    return status === 'failed' ? <ContestError onRetry={resync} /> : <ContestPageSkeleton />;
  }

  return (
    <>
      <ContestView
        contest={contest}
        game={game}
        participants={participants}
        activity={activity}
        viewer={getContestViewer(email, contest, participants)}
        status={status}
        winnerFlash={winnerFlash}
        onStale={resync}
      />
      {/* the game can still be loading when a quarter lands, so the dialog falls back to away and home */}
      <WinnerCelebrationDialog
        result={celebration}
        onClose={() => setCelebration(null)}
        awayAbbr={game?.awayAbbr}
        homeAbbr={game?.homeAbbr}
      />
    </>
  );
}
