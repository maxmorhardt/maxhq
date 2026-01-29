import { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { setupAxiosInterceptors } from '../axios/api';

// hook to set up axios interceptors with user's auth token
export const useAxiosAuth = () => {
  const auth = useAuth();
  const [ready, setReady] = useState(false);

  // configure axios with auth token when user is authenticated
  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user?.id_token) {
      setReady(false);
      return;
    }

    setupAxiosInterceptors(auth.user);
    setReady(true);
  }, [auth.user, auth.isAuthenticated]);

  // returns true when axios is configured with auth token
  return ready;
};
