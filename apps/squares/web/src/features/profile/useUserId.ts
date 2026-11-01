import { useAuth } from 'react-oidc-context';
import { useGetMyProfileQuery } from './api';

export function isMe(userId: string | undefined, id: string | undefined): boolean {
  return !!id && id === userId;
}

export function useUserId(): string | undefined {
  const signedIn = useAuth().isAuthenticated;
  const { data } = useGetMyProfileQuery(undefined, { skip: !signedIn });
  return data?.userId;
}
