import { useParams } from 'react-router';
import RequireAuth from '../auth/RequireAuth';
import LoadingScreen from '../components/feedback/LoadingScreen';
import InviteSignIn from '../features/join/components/InviteSignIn';
import JoinInvite from '../features/join/components/JoinInvite';

export default function JoinPage() {
  const { token = '' } = useParams<{ token: string }>();

  return (
    <RequireAuth
      fallback={<LoadingScreen title="Loading invite..." subtitle="Please wait..." />}
      unauthenticated={<InviteSignIn token={token} />}
    >
      <JoinInvite token={token} />
    </RequireAuth>
  );
}
