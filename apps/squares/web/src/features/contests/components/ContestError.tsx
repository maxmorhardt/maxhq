import { CloudOff, Refresh, Schedule, Search } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import ErrorState from '../../../components/feedback/ErrorState';

interface Props {
  onRetry: () => void;
}

export default function ContestError({ onRetry }: Props) {
  const navigate = useNavigate();

  return (
    <ErrorState
      icon={CloudOff}
      label="Contest"
      title="Failed to get your contest"
      description="We couldn't load the contest right now. Please try again."
      actions={[
        { label: 'Try Again', onClick: onRetry, icon: Refresh },
        { label: 'Browse Contests', onClick: () => navigate('/contests'), icon: Search },
      ]}
      hints={[
        {
          icon: Schedule,
          text: 'This is usually a temporary connection problem. Retrying in a moment often works.',
        },
      ]}
    />
  );
}
