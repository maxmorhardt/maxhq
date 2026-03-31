import { GridView, PlayArrow, SportsScore, Sync } from '@mui/icons-material';
import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import type { ActivityEvent, ActivityEventType } from '../../types/contest';
import ContestSidebarCard from './ContestSidebarCard';

interface ActivityFeedProps {
  events: ActivityEvent[];
}

const eventIcons: Record<ActivityEventType, ReactNode> = {
  square_claimed: <GridView sx={{ fontSize: '0.85rem', color: '#4facfe' }} />,
  score_update: <SportsScore sx={{ fontSize: '0.85rem', color: '#43e97b' }} />,
  quarter_winner: <span style={{ fontSize: '0.75rem' }}>🏆</span>,
  contest_started: <PlayArrow sx={{ fontSize: '0.85rem', color: '#f5af19' }} />,
  contest_status: <Sync sx={{ fontSize: '0.85rem', color: '#a78bfa' }} />,
};

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ActivityFeed({ events }: ActivityFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null);

  // auto-scroll to bottom on new events
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events.length]);

  return (
    <ContestSidebarCard icon={<Sync sx={{ fontSize: '1.1rem' }} />} title="Activity Feed">
      <Box
        ref={feedRef}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          maxHeight: 240,
          overflowY: 'auto',
          pr: 1,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 2,
          },
        }}
      >
        {events.length === 0 ? (
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: '0.8rem',
              textAlign: 'center',
              py: 1.5,
            }}
          >
            No activity yet
          </Typography>
        ) : (
          events.map((event) => (
            <Box
              key={event.id}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 0.75,
                p: 0.6,
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 1,
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.1, flexShrink: 0 }}>
                {eventIcons[event.type]}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: '0.75rem',
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                  }}
                >
                  {event.message}
                </Typography>
                <Typography
                  sx={{
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: '0.7rem',
                    mt: 0.2,
                  }}
                >
                  {formatTime(event.timestamp)}
                </Typography>
              </Box>
            </Box>
          ))
        )}
      </Box>
    </ContestSidebarCard>
  );
}
