import NorthEastIcon from '@mui/icons-material/NorthEast';
import { Avatar, Box, Card, CardActionArea, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { spotlightSx, useSpotlight } from '../../hooks/useSpotlight';
import { easing } from '../../theme';
import RevealSection from '../common/RevealSection';

export interface ContactChannel {
  label: string;
  href: string;
  icon: ReactNode;
  handle: string;
}

interface ContactCardProps {
  channel: ContactChannel;
  delay?: 0 | 1 | 2 | 3 | 4;
}

export default function ContactCard({ channel, delay }: ContactCardProps) {
  const spotlight = useSpotlight();

  return (
    <RevealSection delay={delay} variant="rise" sx={{ minWidth: 0, display: 'flex' }}>
      <Card
        onPointerMove={spotlight.onPointerMove}
        sx={[
          (theme) => spotlightSx(theme),
          {
            flex: 1,
            '&:hover .contact-card__arrow': {
              color: 'primary.main',
              transform: 'translate(3px, -3px)',
            },
          },
        ]}
      >
        <CardActionArea
          component="a"
          href={channel.href}
          target="_blank"
          rel="noreferrer"
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 5,
            p: { xs: 3, md: 3.5 },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Avatar
              variant="rounded"
              sx={{ width: 52, height: 52, bgcolor: 'codeBg', color: 'text.primary' }}
            >
              {channel.icon}
            </Avatar>
            <NorthEastIcon
              className="contact-card__arrow"
              sx={{
                color: 'text.secondary',
                transition: `transform 300ms ${easing.reveal}, color 200ms`,
              }}
            />
          </Box>

          <Box sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            <Typography sx={{ fontWeight: 650, fontSize: '1.3rem', color: 'text.primary' }}>
              {channel.label}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              {channel.handle}
            </Typography>
          </Box>
        </CardActionArea>
      </Card>
    </RevealSection>
  );
}
