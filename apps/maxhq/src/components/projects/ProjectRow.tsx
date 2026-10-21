import GitHubIcon from '@mui/icons-material/GitHub';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import { Box, Typography } from '@mui/material';
import type { ReactElement } from 'react';
import { easing, fonts, primaryTint } from '../../theme';
import RevealSection from '../common/RevealSection';

export interface ProjectLink {
  label: string;
  href: string;
  icon?: ReactElement;
}

export interface Project {
  name: string;
  category: string;
  description: string;
  href: string;
  links?: ProjectLink[];
  tags: string[];
}

interface Props {
  project: Project;
  index: number;
}

const linkSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.75,
  fontSize: '0.88rem',
  fontWeight: 600,
  color: 'text.secondary',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  transition: 'color 160ms',
  '&:hover': { color: 'text.primary' },
  '& svg': { fontSize: 16 },
} as const;

// one repository as a line in the index: its number, what it is, what it's built with, and where to go
export default function ProjectRow({ project, index }: Props) {
  return (
    <RevealSection
      component="li"
      sx={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '72px minmax(0, 1fr) 190px' },
        gap: { xs: 1.5, md: 3 },
        py: { xs: 3.5, md: 4.5 },
        px: { md: 2 },
        mx: { md: -2 },
        borderRadius: { md: '4px' },
        // the divider lines up with the text, not the hover area that reaches past it
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: { xs: 0, md: 16 },
          right: { xs: 0, md: 16 },
          height: '1px',
          bgcolor: 'divider',
        },
        transition: `background-color 240ms ${easing.reveal}`,
        '&:hover': { bgcolor: (theme) => primaryTint(theme, 0.04) },
        '&:hover .project-arrow': { transform: 'translate(3px, -3px)', color: 'primary.main' },
      }}
    >
      <Typography
        aria-hidden
        sx={{
          fontFamily: fonts.mono,
          fontSize: '0.85rem',
          color: 'text.secondary',
          pt: { md: 1.25 },
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </Typography>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'primary.main',
          }}
        >
          {project.category}
        </Typography>
        <Typography variant="h3" sx={{ mt: 0.75, fontSize: { xs: '1.6rem', md: '2rem' } }}>
          {/* the name opens the repository, and its hit area covers the whole row */}
          <Box
            component="a"
            href={project.href}
            target="_blank"
            rel="noreferrer"
            sx={{
              color: 'inherit',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              '&::after': { content: '""', position: 'absolute', inset: 0 },
              '&:focus-visible': { outline: 'none' },
              '&:focus-visible::after': {
                outline: 2,
                outlineStyle: 'solid',
                outlineColor: 'primary.main',
                borderRadius: '4px',
              },
            }}
          >
            {project.name}
            <NorthEastIcon
              className="project-arrow"
              sx={{
                fontSize: '1.1em',
                color: 'text.secondary',
                transition: `transform 240ms ${easing.reveal}, color 160ms`,
              }}
            />
          </Box>
        </Typography>
        <Typography sx={{ mt: 1.25, maxWidth: '68ch' }}>{project.description}</Typography>
        <Typography
          sx={{
            mt: 2,
            fontFamily: fonts.mono,
            fontSize: '0.8rem',
            color: 'text.secondary',
            overflowWrap: 'anywhere',
          }}
        >
          {project.tags.join('  ·  ')}
        </Typography>
      </Box>

      {/* above the row's link so each one stays clickable on its own */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: { xs: 'row', md: 'column' },
          flexWrap: 'wrap',
          alignItems: { md: 'flex-start' },
          gap: { xs: 2.5, md: 1.25 },
          pt: { md: 1.25 },
          justifySelf: { md: 'start' },
        }}
      >
        <Box component="a" href={project.href} target="_blank" rel="noreferrer" sx={linkSx}>
          <GitHubIcon />
          Repository
        </Box>
        {project.links?.map((link) => (
          <Box
            key={link.href}
            component="a"
            href={link.href}
            target="_blank"
            rel="noreferrer"
            sx={linkSx}
          >
            {link.icon ?? <NorthEastIcon />}
            {link.label}
          </Box>
        ))}
      </Box>
    </RevealSection>
  );
}
