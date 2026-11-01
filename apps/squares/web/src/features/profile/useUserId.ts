import { useAuth } from 'react-oidc-context';
import { useGetMyProfileQuery } from './api';

export interface Me {
  userId?: string;
  isLoading?: boolean;
  isError?: boolean;
  refetch?: () => void;
}

export function isMe(me: Me, id: string | undefined): boolean {
  return !!id && id === me.userId;
}

export function useMe(): Me {
  const signedIn = useAuth().isAuthenticated;
  const { data, isLoading, isError, refetch } = useGetMyProfileQuery(undefined, {
    skip: !signedIn,
  });
  // a failed refetch keeps the last profile, which still identifies the user
  return { userId: data?.userId, isLoading, isError: isError && !data, refetch };
}
