import {
  EmojiEvents,
  GridOff,
  GridView,
  PersonAdd,
  PersonRemove,
  PlayArrow,
  SportsScore,
  Sync,
} from '@mui/icons-material';
import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import type { ActivityEvent, ActivityEventType } from '../../../../types/contest';
import ContestSidebarCard from './ContestSidebarCard';

interface ActivityFeedProps {
  events: ActivityEvent[];
}

const iconSx = { fontSize: '0.95rem' };

const eventIcons: Record<ActivityEventType, { icon: ReactNode; color: string }> = {
  square_claimed: { icon: <GridView sx={iconSx} />, color: 'primary.main' },
  square_cleared: { icon: <GridOff sx={iconSx} />, color: 'text.secondary' },
  score_update: { icon: <SportsScore sx={iconSx} />, color: 'success.main' },
  quarter_winner: { icon: <EmojiEvents sx={iconSx} />, color: 'secondary.main' },
  contest_started: { icon: <PlayArrow sx={iconSx} />, color: 'warning.main' },
  contest_status: { icon: <Sync sx={iconSx} />, color: 'text.secondary' },
  participant_added: { icon: <PersonAdd sx={iconSx} />, color: 'success.main' },
  participant_removed: { icon: <PersonRemove sx={iconSx} />, color: 'error.main' },
};

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function ActivityFeed({ events }: ActivityFeedProps) {
  const feedRef = useRef<HTMLOListElement>(null);

  // keep the newest entry in view as the feed grows
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events.length]);

  return (
    <ContestSidebarCard icon={<Sync fontSize="small" />} title="Activity Feed">
      {events.length === 0 ? (
        <Typography
          sx={{ color: 'text.secondary', fontSize: '0.85rem', textAlign: 'center', py: 2 }}
        >
          No activity yet
        </Typography>
      ) : (
        <Box
          component="ol"
          ref={feedRef}
          sx={{
            m: 0,
            p: 0,
            listStyle: 'none',
            maxHeight: 320,
            overflowY: 'auto',
            pr: 0.5,
          }}
        >
          {events.map((event, i) => {
            const { icon, color } = eventIcons[event.type];
            const last = i === events.length - 1;

            return (
              <Box
                key={event.id}
                component="li"
                sx={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: '28px minmax(0, 1fr)',
                  gap: 1.25,
                  pb: last ? 0 : 1.5,
                  // the timeline rule that joins one entry's dot to the next
                  ...(!last && {
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 13,
                      top: 28,
                      bottom: 0,
                      width: 2,
                      bgcolor: 'divider',
                    },
                  }),
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.default',
                    color,
                  }}
                >
                  {icon}
                </Box>
                <Box sx={{ minWidth: 0, pt: 0.25 }}>
                  <Typography
                    sx={{ fontSize: '0.85rem', lineHeight: 1.35, overflowWrap: 'anywhere' }}
                  >
                    {event.message}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.74rem', mt: 0.25 }}>
                    {formatTime(event.timestamp)}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </ContestSidebarCard>
  );
}
