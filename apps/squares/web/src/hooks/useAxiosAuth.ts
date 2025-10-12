import { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { setupAxiosInterceptors } from '../axios/api';

export const useAxiosAuth = () => {
  const auth = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user?.access_token) {
      setReady(false);
      return;
    }

    setupAxiosInterceptors(auth.user);
    setReady(true);
  }, [auth.user, auth.isAuthenticated]);

  return ready;
};
