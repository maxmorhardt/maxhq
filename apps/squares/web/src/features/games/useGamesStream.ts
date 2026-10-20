import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../api/baseQuery';
import { openEventStream, type StreamStatus } from '../../api/eventStream';
import { useAppDispatch } from '../../app/hooks';
import type { Game, ScoreboardWeek } from '../../types/contest';
import { gamesApi } from './api';

export const gamesEventsUrl = `${API_BASE_URL}/events/games`;

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

// patches the cached scoreboard for this week as games change, so scores move without a refetch
export function useGamesStream(week: ScoreboardWeek | undefined): StreamStatus {
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<StreamStatus>('connecting');

  useEffect(() => {
    const stream = openEventStream({
      url: gamesEventsUrl,
      getToken: noToken,
      onStatus: setStatus,
      onRejected: () => setStatus('failed'),
      onMessage: ({ data }) => {
        const game = parseGame(data);
        if (!game) {
          return;
        }

        dispatch(
          gamesApi.util.updateQueryData('getScoreboard', week, (board) => {
            const index = board.games.findIndex((g) => g.id === game.id);
            if (index !== -1 && game.updatedAt >= board.games[index].updatedAt) {
              board.games[index] = game;
            }
          })
        );
      },
    });

    return () => stream.close();
  }, [dispatch, week]);

  return status;
}
