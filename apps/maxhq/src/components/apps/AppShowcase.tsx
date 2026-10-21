import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import { Box, Button, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { primaryTint } from '../../theme';
import RevealSection from '../common/RevealSection';

export interface AppFeature {
  title: string;
  body: string;
}

// everything the apps page needs to present one app; adding an app is adding one of these
export interface AppEntry {
  id: string;
  name: string;
  tagline: string;
  // a small mark for the app's tile
  icon: ReactNode;
  description: string;
  href: string;
  status: 'Live' | 'In development';
  // the button label; defaults to "Open <name>"
  cta?: string;
  features: AppFeature[];
  // the app at work, on its own stage
  visual: ReactNode;
  // anything longer the app wants under its card, like how a game plays out
  extra?: ReactNode;
}

interface Props {
  app: AppEntry;
  // alternate sides down the page so a longer list keeps a rhythm
  flip?: boolean;
}

export default function AppShowcase({ app, flip = false }: Props) {
  const live = app.status === 'Live';

  return (
    <Box
      component="article"
      id={app.id}
      aria-labelledby={`${app.id}-name`}
      sx={{ scrollMarginTop: 96 }}
    >
      <RevealSection variant="rise">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            borderRadius: '28px',
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ order: { md: flip ? 2 : 1 }, p: { xs: 3, md: 5 } }}>
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.25,
                py: 0.4,
                borderRadius: 999,
                border: 1,
                borderColor: 'divider',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'text.secondary',
              }}
            >
              <Box
                component="span"
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: live ? 'success.main' : 'warning.main',
                }}
              />
              {app.status}
            </Box>

            <Typography
              id={`${app.id}-name`}
              variant="h2"
              sx={{ mt: 2.5, fontSize: { xs: '2.6rem', md: '3.4rem' } }}
            >
              {app.name}
            </Typography>
            <Typography sx={{ mt: 1, color: 'text.primary', fontSize: '1.2rem', fontWeight: 560 }}>
              {app.tagline}
            </Typography>
            <Typography sx={{ mt: 1.5, maxWidth: '52ch' }}>{app.description}</Typography>

            <Box
              component="ul"
              sx={{ listStyle: 'none', m: 0, mt: 3.5, p: 0, display: 'grid', gap: 2 }}
            >
              {app.features.map((feature) => (
                <Box component="li" key={feature.title} sx={{ display: 'flex', gap: 1.5 }}>
                  <CheckCircleIcon sx={{ mt: '2px', fontSize: 20, color: 'primary.main' }} />
                  <Box>
                    <Typography
                      component="h3"
                      sx={{ fontWeight: 650, color: 'text.primary', lineHeight: 1.4 }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography variant="body2">{feature.body}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            {live && (
              <Button
                component="a"
                href={app.href}
                target="_blank"
                rel="noreferrer"
                variant="contained"
                size="large"
                endIcon={<NorthEastIcon />}
                sx={{ mt: 4 }}
              >
                {app.cta ?? `Open ${app.name}`}
              </Button>
            )}
          </Box>

          <Box
            sx={{
              order: { md: flip ? 1 : 2 },
              display: 'grid',
              placeItems: 'center',
              minHeight: { xs: 300, md: '100%' },
              p: { xs: 3, md: 5 },
              borderStyle: 'solid',
              borderColor: 'divider',
              borderWidth: { xs: '1px 0 0', md: flip ? '0 1px 0 0' : '0 0 0 1px' },
              backgroundImage: (theme) =>
                `radial-gradient(70% 70% at 50% 40%, ${primaryTint(theme, 0.16)}, transparent 72%)`,
              backgroundColor: 'background.default',
            }}
          >
            {app.visual}
          </Box>
        </Box>
      </RevealSection>

      {app.extra && <Box sx={{ mt: { xs: 5, md: 7 } }}>{app.extra}</Box>}
    </Box>
  );
}
