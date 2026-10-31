import { Box, Container, Typography } from '@mui/material';
import Reveal from '../../../components/Reveal';
import type { ActivityEvent } from '../../../types/contest';
import { describeEvent, type Before } from '../../contests/live/activity';
import type { ContestEvent } from '../../contests/live/events';
import ActivityFeed from '../../contests/components/sidebar/ActivityFeed';

interface Feature {
  title: string;
  body: string;
}

const features: Feature[] = [
  {
    title: 'Live on every screen',
    body: 'Claims, scores, and winners stream to every phone the moment they happen. No refreshing, no group-chat screenshots.',
  },
  {
    title: 'Real scores, called for you',
    body: 'Every contest follows a live NFL game: the score updates on its own, and each quarter’s winner is worked out automatically.',
  },
  {
    title: 'Your pool, your rules',
    body: 'Private or public, invite links with limits and expiry, and a per-person cap on how many squares each player can claim.',
  },
  {
    title: 'Free, with nothing to install',
    body: 'It runs in the browser on any phone or laptop. Sign in with Google, Microsoft, or GitHub and you are on the board.',
  },
];

// a game night as the real feed tells it: built by the same code from the events a contest receives
const at = (hour: number, minute: number) => new Date(2026, 9, 25, hour, minute).toISOString();

function sample(type: ContestEvent['type'], data: object, timestamp: string, before?: Before) {
  const event = { type, contestId: 'demo', updatedBy: 'demo', timestamp, data } as ContestEvent;
  return describeEvent(event, `${type}-${timestamp}`, before);
}

const sampleActivity = [
  sample(
    'participant.joined',
    { userId: 'jordan@gmail.com', displayName: 'Jordan Diaz' },
    at(18, 58)
  ),
  sample(
    'square.updated',
    { row: 4, col: 7, value: 'JD', owner: 'jordan@gmail.com', ownerName: 'Jordan Diaz' },
    at(19, 2)
  ),
  sample('contest.updated', { status: 'Q1' }, at(20, 20), { status: 'ACTIVE' }),
  sample(
    'quarter.recorded',
    { quarter: 1, homeTeamScore: 7, awayTeamScore: 3, winner: 'sam@gmail.com', winnerName: 'Sam' },
    at(20, 58)
  ),
  sample(
    'quarter.recorded',
    {
      quarter: 2,
      homeTeamScore: 14,
      awayTeamScore: 7,
      winner: 'jordan@gmail.com',
      winnerName: 'Jordan Diaz',
    },
    at(21, 43)
  ),
].filter((entry): entry is ActivityEvent => entry !== null);

export default function LandingFeatures() {
  return (
    <Box component="section" sx={{ py: { xs: 8, md: 12 } }}>
      <Container
        maxWidth="lg"
        sx={{
          display: 'grid',
          gridTemplateColumns: { md: 'minmax(0, 1.15fr) minmax(0, 0.85fr)' },
          gap: { xs: 6, md: 10 },
          alignItems: 'center',
        }}
      >
        <Box>
          <Reveal>
            <Typography variant="h2" sx={{ fontSize: 'clamp(2.6rem, 5.6vw, 4.4rem)' }}>
              Built for game day
            </Typography>
          </Reveal>

          <Box
            sx={{
              mt: 5,
              display: 'grid',
              gridTemplateColumns: { sm: '1fr 1fr' },
              columnGap: 5,
            }}
          >
            {features.map((feature, i) => (
              <Reveal
                key={feature.title}
                delay={i * 80}
                sx={{ py: 3, borderTop: 1, borderColor: 'divider' }}
              >
                <Typography variant="h3" sx={{ fontSize: '1.55rem', lineHeight: 1.05 }}>
                  {feature.title}
                </Typography>
                <Typography sx={{ mt: 1.25, color: 'text.secondary', lineHeight: 1.6 }}>
                  {feature.body}
                </Typography>
              </Reveal>
            ))}
          </Box>
        </Box>

        <Reveal delay={150}>
          <Box
            role="figure"
            aria-label="Example contest activity"
            sx={{ boxShadow: '0 40px 90px -40px rgba(0, 0, 0, 0.9)', borderRadius: '14px' }}
          >
            <ActivityFeed events={sampleActivity} />
          </Box>
        </Reveal>
      </Container>
    </Box>
  );
}
