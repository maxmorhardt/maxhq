import { useAuth } from "react-oidc-context";
import { useEffect, useState } from "react";
import { setupAxiosInterceptors } from "../config/axios";

export function useAxiosAuth() {
  const auth = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.access_token && !ready) {
      setupAxiosInterceptors(auth.user);
      setReady(true);
    }
  }, [auth.isAuthenticated, auth.user, auth.user?.access_token, ready]);

  return ready;
}
