import { Home, Lock, Search, Share } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ErrorState from '../../components/common/ErrorState';

export default function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <ErrorState
      icon={Lock}
      label="403"
      title="Access Denied"
      description="This contest is private. You need an invite link from the contest owner to access it."
      actions={[
        { label: 'Go Home', onClick: () => navigate('/'), icon: Home },
        { label: 'My Contests', onClick: () => navigate('/contests'), icon: Search },
      ]}
      hints={[
        {
          icon: Share,
          text: 'Contest owners can share an invite link that grants you access.',
        },
      ]}
    />
  );
}
