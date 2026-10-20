import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { errorMessage, errorStatus } from '../../../api/errors';
import LoadingScreen from '../../../components/feedback/LoadingScreen';
import { usePreviewInviteQuery, useRedeemInviteMutation } from '../../contests/api';
import { useToast } from '../../toast/useToast';
import JoinError from './JoinError';

interface Props {
  token: string;
}

// redeems the invite as soon as it checks out, then sends the new participant to the contest
export default function JoinInvite({ token }: Props) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: preview, error: previewError } = usePreviewInviteQuery(token);
  const [redeemInvite, { error: redeemError }] = useRedeemInviteMutation();
  const redeemed = useRef(false);

  useEffect(() => {
    if (!preview || redeemed.current) {
      return;
    }
    redeemed.current = true;

    redeemInvite(token)
      .unwrap()
      .then((participant) => {
        showToast('Successfully joined contest!', 'success');
        navigate(`/contests/${participant.contestId}`, { replace: true });
      })
      .catch((err: unknown) => {
        // already a participant, so the invite has nothing left to do
        if (errorStatus(err) === 409) {
          navigate(`/contests/${preview.contestId}`, { replace: true });
          return;
        }
        showToast(errorMessage(err, 'Failed to join contest'), 'error');
      });
  }, [preview, token, redeemInvite, navigate, showToast]);

  const error = previewError ?? (errorStatus(redeemError) === 409 ? undefined : redeemError);

  if (errorStatus(error) === 422) {
    return <JoinError variant="no-squares" preview={preview} />;
  }

  if (error) {
    return (
      <JoinError
        variant="error"
        message={errorMessage(error, 'This invite link is invalid or expired')}
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
