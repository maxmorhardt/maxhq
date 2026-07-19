import { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { setupAxiosInterceptors, setUnauthorizedHandler } from '../axios/api';

export const useAxiosAuth = () => {
  const { user, isAuthenticated, removeUser } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id_token) {
      setReady(false);
      return;
    }

    setupAxiosInterceptors(user);
    setUnauthorizedHandler(() => {
      void removeUser();
    });

    setReady(true);

    return () => setUnauthorizedHandler(null);
  }, [user, isAuthenticated, removeUser]);

  return ready;
};
