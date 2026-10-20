import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BookOutlinedIcon from '@mui/icons-material/BookOutlined';
import DnsIcon from '@mui/icons-material/Dns';
import { Box, Typography } from '@mui/material';
import { Fragment, type ReactNode } from 'react';
import { fonts, primaryTint } from '../../theme';

interface Stop {
  name: string;
  icon: ReactNode;
  entries: string[];
}

interface Hop {
  label: string;
}

const stops: Stop[] = [
  {
    name: 'maxhq',
    icon: <BookOutlinedIcon fontSize="small" />,
    entries: ['apps/', 'charts/', 'infra/', 'libs/'],
  },
  {
    name: 'workflows',
    icon: <BookOutlinedIcon fontSize="small" />,
    entries: ['ci-node.yml', 'ci-go.yml', 'ci-docker.yml', 'cd-argocd.yml'],
  },
  {
    name: 'gitops',
    icon: <BookOutlinedIcon fontSize="small" />,
    entries: ['clusters/dev/', 'clusters/prod/'],
  },
  {
    name: 'clusters',
    icon: <DnsIcon fontSize="small" />,
    entries: ['dev · raspberry pis', 'prod · three vpses'],
  },
];

const hops: Hop[] = [
  { label: 'calls reusable ci' },
  { label: 'commits image tags' },
  { label: 'argo cd syncs' },
];

function Hop({ hop }: { hop: Hop }) {
  return (
    <Box
      aria-hidden
      sx={{
        display: 'flex',
        flexDirection: { xs: 'row', md: 'column' },
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        py: { xs: 1, md: 0 },
        color: 'text.secondary',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          width: { xs: 2, md: '100%' },
          minWidth: { md: 48 },
          height: { xs: 28, md: 2 },
          bgcolor: 'divider',
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: (theme) => {
              const { palette } = theme.vars ?? theme;

              return `linear-gradient(90deg, transparent, ${palette.primary.main}, transparent)`;
            },
            animation: 'repo-flow 2.4s linear infinite',
            '@keyframes repo-flow': {
              from: { transform: 'translateX(-100%)' },
              to: { transform: 'translateX(100%)' },
            },
            '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0.4 },
          },
        }}
      />
      <Typography
        component="span"
        sx={{
          fontFamily: fonts.mono,
          fontSize: '0.7rem',
          textAlign: 'center',
          width: { md: 88 },
          lineHeight: 1.4,
        }}
      >
        {hop.label}
      </Typography>
      <ArrowForwardIcon
        sx={{ fontSize: 16, transform: { xs: 'rotate(90deg)', md: 'none' }, opacity: 0.6 }}
      />
    </Box>
  );
}

// how a commit travels from the monorepo to a running cluster
export default function RepoMap() {
  return (
    <Box
      component="ol"
      aria-label="How a change reaches the clusters"
      sx={{
        m: 0,
        p: 0,
        listStyle: 'none',
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: 'minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr)',
        },
        alignItems: 'stretch',
        justifyItems: { xs: 'center', md: 'stretch' },
      }}
    >
      {stops.map((stop, i) => (
        <Fragment key={stop.name}>
          <Box
            component="li"
            sx={{
              width: '100%',
              maxWidth: { xs: 360, md: 'none' },
              p: 2.25,
              borderRadius: '14px',
              border: 1,
              borderColor: i === stops.length - 1 ? 'primary.main' : 'divider',
              bgcolor:
                i === stops.length - 1 ? (theme) => primaryTint(theme, 0.08) : 'background.paper',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
              {stop.icon}
              <Typography
                component="span"
                sx={{ fontFamily: fonts.mono, fontWeight: 600, color: 'primary.main' }}
              >
                {stop.name}
              </Typography>
            </Box>
            <Box
              component="ul"
              sx={{
                m: 0,
                mt: 1.5,
                p: 0,
                listStyle: 'none',
                display: 'grid',
                gap: 0.5,
                fontFamily: fonts.mono,
                fontSize: '0.76rem',
                color: 'text.secondary',
              }}
            >
              {stop.entries.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </Box>
          </Box>
          {i < hops.length ? <Hop hop={hops[i]} /> : null}
        </Fragment>
      ))}
    </Box>
  );
}
