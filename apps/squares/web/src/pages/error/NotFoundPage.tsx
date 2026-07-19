import { Home, LinkOff, Search, TravelExplore } from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';
import ErrorState, { type ErrorStateAction } from '../../components/common/ErrorState';
import { gradients } from '../../types/gradients';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const auth = useAuth();

  const actions: ErrorStateAction[] = [
    { label: 'Go Home', onClick: () => navigate('/'), icon: Home },
  ];

  if (auth.isAuthenticated) {
    actions.push({ label: 'Browse Contests', onClick: () => navigate('/contests'), icon: Search });
  }

  return (
    <>
      <Helmet>
        <title>Page Not Found – Squares</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <ErrorState
        icon={TravelExplore}
        accent={gradients.primary}
        label="404"
        title="Page Not Found"
        description="The page you're looking for doesn't exist. It might have been moved, deleted, or the URL mistyped."
        actions={actions}
        hints={[
          {
            icon: LinkOff,
            text: 'Double-check the address for typos. If you followed a link to get here, it may be out of date.',
          },
        ]}
      />
    </>
  );
}
