import AddIcon from '@mui/icons-material/Add';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import { Box, Typography } from '@mui/material';
import { easing, primaryTint } from '../../theme';
import RevealSection from '../common/RevealSection';
import type { AppEntry } from './AppShowcase';

const COLUMNS = 3;

const tileSx = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 220,
  p: 3,
  borderRadius: '22px',
  border: 1,
  borderColor: 'divider',
} as const;

function AppTile({ app }: { app: AppEntry }) {
  const live = app.status === 'Live';

  return (
    <Box
      component="li"
      sx={{
        ...tileSx,
        bgcolor: 'background.paper',
        transition: `border-color 200ms, transform 300ms ${easing.reveal}`,
        '&:hover': { borderColor: 'primary.main', transform: 'translateY(-3px)' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box
          aria-hidden
          sx={{
            display: 'grid',
            placeItems: 'center',
            width: 48,
            height: 48,
            borderRadius: '14px',
            color: 'primary.main',
            bgcolor: (theme) => primaryTint(theme, 0.14),
            '& svg': { fontSize: 26 },
          }}
        >
          {app.icon}
        </Box>
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
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
      </Box>

      <Typography variant="h3" sx={{ mt: 2.5 }}>
        {/* the name jumps to the app's details, and its hit area covers the tile */}
        <Box
          component="a"
          href={`#${app.id}`}
          sx={{
            color: 'inherit',
            textDecoration: 'none',
            '&::after': { content: '""', position: 'absolute', inset: 0, borderRadius: 'inherit' },
          }}
        >
          {app.name}
        </Box>
      </Typography>
      <Typography sx={{ mt: 0.75, flex: 1 }}>{app.tagline}</Typography>

      {live && (
        <Box
          component="a"
          href={app.href}
          target="_blank"
          rel="noreferrer"
          sx={{
            position: 'relative',
            zIndex: 1,
            alignSelf: 'flex-start',
            mt: 2.5,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            fontWeight: 600,
            fontSize: '0.92rem',
            color: 'primary.main',
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
            '& svg': { fontSize: 16 },
          }}
        >
          {app.cta ?? `Open ${app.name}`}
          <NorthEastIcon />
        </Box>
      )}
    </Box>
  );
}

// every app as a tile, with a placeholder that fills out the last row until the next one ships
export default function AppDirectory({ apps }: { apps: AppEntry[] }) {
  const span = COLUMNS - (apps.length % COLUMNS);

  return (
    <RevealSection
      component="ul"
      aria-label="Apps"
      sx={{
        listStyle: 'none',
        m: 0,
        p: 0,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: `repeat(${COLUMNS}, minmax(0, 1fr))` },
        gap: 2,
      }}
    >
      {apps.map((app) => (
        <AppTile key={app.id} app={app} />
      ))}
      <Box
        component="li"
        sx={{
          ...tileSx,
          gridColumn: { md: `span ${span}` },
          borderStyle: 'dashed',
          justifyContent: 'center',
          alignItems: { xs: 'flex-start', md: 'center' },
          textAlign: { md: 'center' },
          color: 'text.secondary',
        }}
      >
        <Box
          aria-hidden
          sx={{
            display: 'grid',
            placeItems: 'center',
            width: 48,
            height: 48,
            borderRadius: '14px',
            border: 1,
            borderStyle: 'dashed',
            borderColor: 'divider',
          }}
        >
          <AddIcon />
        </Box>
        <Typography variant="h3" sx={{ mt: 2, color: 'text.primary' }}>
          More apps on the way
        </Typography>
        <Typography sx={{ mt: 0.75, maxWidth: '44ch' }}>
          New apps land here as they launch, and the same maxhq account signs you in to all of them.
        </Typography>
      </Box>
    </RevealSection>
  );
}
