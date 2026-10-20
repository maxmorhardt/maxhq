import CallMergeIcon from '@mui/icons-material/CallMerge';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SyncIcon from '@mui/icons-material/Sync';
import { Box, Paper, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { fonts, primaryTint } from '../../theme';

interface Stage {
  icon: ReactNode;
  title: string;
  detail: string;
}

const stages: Stage[] = [
  { icon: <CallMergeIcon />, title: 'Pull request merged', detail: 'squashed into main' },
  { icon: <FactCheckIcon />, title: 'Checks pass', detail: 'lint · types · tests' },
  { icon: <Inventory2Icon />, title: 'Image built', detail: 'sha-2369a65' },
  { icon: <SyncIcon />, title: 'Argo CD syncs dev', detail: 'gitops/clusters/dev' },
  { icon: <RocketLaunchIcon />, title: 'Release to prod', detail: 'same image, retagged' },
];

// each stage lights in turn as the chapter's --progress passes its start
const START = 0.32;
const STEP = 0.11;
const lit = (i: number) => `clamp(0, calc((var(--progress, 0) - ${START + i * STEP}) * 14), 1)`;
const lineFill = `clamp(0, calc((var(--progress, 0) - ${START}) / ${STEP * (stages.length - 1)}), 1)`;

export default function PipelineVisual() {
  return (
    <Paper
      component="ol"
      aria-label="Delivery pipeline"
      sx={{
        position: 'relative',
        m: 0,
        listStyle: 'none',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: `repeat(${stages.length}, minmax(0, 1fr))` },
        rowGap: 3.5,
        px: { xs: 3, md: 2 },
        py: { xs: 4, md: 5 },
      }}
    >
      {/* the track behind the stage nodes */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          bgcolor: 'divider',
          top: { xs: 56, md: 64 },
          bottom: { xs: 56, md: 'auto' },
          left: { xs: 47, md: '10%' },
          right: { md: '10%' },
          width: { xs: 2, md: 'auto' },
          height: { md: 2 },
        }}
      >
        <Box
          sx={(theme) => {
            const { palette } = theme.vars ?? theme;

            return {
              position: 'absolute',
              inset: 0,
              transformOrigin: 'top',
              transform: `scaleY(${lineFill})`,
              background: `linear-gradient(180deg, ${palette.primary.main}, ${palette.success.main})`,
              [theme.breakpoints.up('md')]: {
                transformOrigin: 'left',
                transform: `scaleX(${lineFill})`,
                background: `linear-gradient(90deg, ${palette.primary.main}, ${palette.success.main})`,
              },
            };
          }}
        />
      </Box>

      {stages.map((stage, i) => (
        <Box
          key={stage.title}
          component="li"
          sx={{
            position: 'relative',
            display: 'flex',
            flexDirection: { xs: 'row', md: 'column' },
            alignItems: 'center',
            gap: { xs: 2.5, md: 2 },
            textAlign: { md: 'center' },
          }}
        >
          <Box
            sx={{
              position: 'relative',
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              color: 'text.secondary',
              '& svg': { fontSize: 22 },
            }}
          >
            {stage.icon}

            {/* the lit version of the node, faded in by scroll */}
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                inset: -1,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                border: 1,
                borderColor: i === stages.length - 1 ? 'success.main' : 'primary.main',
                bgcolor: (theme) => primaryTint(theme, 0.14),
                color: i === stages.length - 1 ? 'success.main' : 'primary.main',
                opacity: lit(i),
              }}
            >
              {stage.icon}
            </Box>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: 'text.primary', fontWeight: 600, lineHeight: 1.35 }}>
              {stage.title}
            </Typography>
            <Typography
              variant="body2"
              sx={{ mt: 0.5, fontFamily: fonts.mono, fontSize: '0.74rem' }}
            >
              {stage.detail}
            </Typography>
          </Box>
        </Box>
      ))}
    </Paper>
  );
}
