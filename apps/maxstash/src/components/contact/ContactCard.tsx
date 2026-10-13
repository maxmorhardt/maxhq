import NorthEastIcon from '@mui/icons-material/NorthEast';
import { Avatar, Box, Card, CardActionArea, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import RevealSection from '../common/RevealSection';

export interface ContactChannel {
  label: string;
  href: string;
  icon: ReactNode;
  handle: string;
}

export interface ContactCardProps {
  channel: ContactChannel;
  delay?: 0 | 1 | 2 | 3 | 4;
}

export default function ContactCard({ channel, delay }: ContactCardProps) {
  return (
    <RevealSection
      delay={delay}
      variant="scale"
      sx={{ minWidth: 0, maxWidth: 400, flex: '1 1 280px', display: 'flex' }}
    >
      <Card
        sx={{
          flex: 1,
          '&:hover': { transform: 'translateY(-4px)', borderColor: 'primary.main' },
          '&:hover .contact-card__arrow': { opacity: 1, color: 'primary.main' },
          '@media (prefers-reduced-motion: reduce)': { '&:hover': { transform: 'none' } },
        }}
      >
        <CardActionArea
          component="a"
          href={channel.href}
          target="_blank"
          rel="noreferrer"
          sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}
        >
          <Avatar variant="rounded" sx={{ bgcolor: 'action.hover', color: 'text.primary' }}>
            {channel.icon}
          </Avatar>

          <Box sx={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere' }}>
            <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>{channel.label}</Typography>
            <Typography variant="body2" color="text.secondary">
              {channel.handle}
            </Typography>
          </Box>

          <NorthEastIcon
            className="contact-card__arrow"
            fontSize="small"
            sx={{ color: 'text.secondary', opacity: 0.5, transition: 'opacity 0.2s, color 0.2s' }}
          />
        </CardActionArea>
      </Card>
    </RevealSection>
  );
}
