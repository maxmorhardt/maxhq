import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../api/baseQuery';
import { openEventStream, type StreamStatus } from '../../api/eventStream';
import { useAppDispatch } from '../../app/hooks';
import type { Game } from '../../types/contest';
import { gamesApi } from './api';

export const gameEventsUrl = (gameId: string) =>
  `${API_BASE_URL}/events/games/${encodeURIComponent(gameId)}`;

// the scores are public, so the stream is opened without a token
const noToken = async () => null;

function parseGame(data: string): Game | null {
  try {
    const parsed = JSON.parse(data) as { game?: Game };
    return parsed.game?.id ? parsed.game : null;
  } catch {
    return null;
  }
}

// follows one game live while a contest on it is open, keeping its cached copy current
export function useGameStream(gameId: string | undefined): StreamStatus | null {
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<StreamStatus | null>(null);

  useEffect(() => {
    if (!gameId) {
      return;
    }

    const stream = openEventStream({
      url: gameEventsUrl(gameId),
      getToken: noToken,
      onStatus: setStatus,
      onRejected: () => setStatus('failed'),
      onMessage: ({ data }) => {
        const game = parseGame(data);
        if (!game || game.id !== gameId) {
          return;
        }

        dispatch(
          gamesApi.util.updateQueryData('getGame', gameId, (cached) =>
            game.updatedAt >= cached.updatedAt ? game : cached
          )
        );
      },
    });

    return () => stream.close();
  }, [dispatch, gameId]);

  return gameId ? status : null;
}
