import { HelpOutlineOutlined, LinkOff } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import ErrorState from '../../../components/feedback/ErrorState';

interface Props {
  message: string;
  status?: number;
}

export default function JoinError({ message, status }: Props) {
  const navigate = useNavigate();

  return (
    <ErrorState
      icon={LinkOff}
      accent="#ff5d5d"
      label="Invite Link"
      title="Unable to Join"
      description={message}
      hints={
        status === 404
          ? [
              {
                icon: HelpOutlineOutlined,
                text: 'An invite link stops working when the owner resets it. Ask whoever invited you for the current one.',
              },
            ]
          : []
      }
      actions={[{ label: 'My Contests', onClick: () => navigate('/contests') }]}
    />
  );
}
