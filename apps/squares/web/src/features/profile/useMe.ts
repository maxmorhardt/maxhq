import { useAuth } from 'react-oidc-context';
import { useGetMyProfileQuery } from './api';

// contests name players by user id, never by email
export interface Me {
  userId?: string;
  isLoading?: boolean;
}

export function isMe(me: Me, id: string | undefined): boolean {
  return !!id && id === me.userId;
}

export function useMe(): Me {
  const signedIn = useAuth().isAuthenticated;
  const { data, isLoading } = useGetMyProfileQuery(undefined, { skip: !signedIn });
  return { userId: data?.userId, isLoading };
}
