import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { errorMessage, errorStatus } from '../../../api/errors';
import LoadingScreen from '../../../components/feedback/LoadingScreen';
import { useJoinContestMutation, usePreviewInviteQuery } from '../../contests/api';
import { trackConversion } from '../../../utils/googleAds';
import { useToast } from '../../toast/useToast';
import JoinError from './JoinError';

interface Props {
  token: string;
}

// joins as soon as the link checks out, then sends the new player to the contest
export default function JoinInvite({ token }: Props) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: preview, error: previewError } = usePreviewInviteQuery(token);
  const [joinContest, { error: joinError }] = useJoinContestMutation();
  const joined = useRef(false);

  useEffect(() => {
    if (!preview || joined.current) {
      return;
    }
    joined.current = true;

    joinContest(token)
      .unwrap()
      .then((player) => {
        trackConversion('joinedContest');
        showToast(
          preview.status === 'ACTIVE'
            ? `You joined ${preview.contestName}`
            : `You joined ${preview.contestName}. The game’s on, so you can watch.`,
          'success'
        );
        navigate(`/contests/${player.contestId}`, { replace: true });
      })
      .catch((err: unknown) => {
        // already a player, so the link has nothing left to do
        if (errorStatus(err) === 409) {
          navigate(`/contests/${preview.contestId}`, { replace: true });
        }
      });
  }, [preview, token, joinContest, navigate, showToast]);

  const error = previewError ?? (errorStatus(joinError) === 409 ? undefined : joinError);

  if (error) {
    return (
      <JoinError
        message={errorMessage(error, 'This invite link doesn’t work anymore')}
        status={errorStatus(error)}
      />
    );
  }

  if (!preview) {
    return <LoadingScreen title="Loading invite..." subtitle="Fetching contest details" />;
  }

  return (
    <LoadingScreen
      title="Joining contest..."
      subtitle={`Preparing your spot in ${preview.contestName}`}
    />
  );
}
