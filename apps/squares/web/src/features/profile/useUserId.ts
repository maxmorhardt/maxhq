import { useAuth } from 'react-oidc-context';
import { useLocation } from 'react-router';
import { useGetMyProfileQuery } from './api';

export function isMe(userId: string | undefined, id: string | undefined): boolean {
  return !!id && id === userId;
}

export function useUserId(): string | undefined {
  const signedIn = useAuth().isAuthenticated;
  // the callback page lifts a deleted account's block first; a call before that is refused and signs the user out
  const restoring = useLocation().pathname === '/auth/callback';
  const { data } = useGetMyProfileQuery(undefined, { skip: !signedIn || restoring });
  return data?.userId;
}
