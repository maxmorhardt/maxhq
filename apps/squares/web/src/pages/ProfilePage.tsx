import { Container } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import RequireAuth from '../auth/RequireAuth';
import SignInPrompt from '../auth/SignInPrompt';
import Profile from '../features/profile/components/Profile';
import ProfileSkeleton from '../features/profile/components/ProfileSkeleton';

export default function ProfilePage() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 4 }, px: { xs: 2, sm: 3 } }}>
      <Helmet>
        <title>Profile – Squares</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <RequireAuth
        fallback={<ProfileSkeleton />}
        unauthenticated={
          <SignInPrompt
            title="Sign in to see your profile"
            description="Your initials, stats, and account settings are here once you sign in."
          />
        }
      >
        <Profile />
      </RequireAuth>
    </Container>
  );
}
