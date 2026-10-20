import BookOutlinedIcon from '@mui/icons-material/BookOutlined';
import GitHubIcon from '@mui/icons-material/GitHub';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Button, Card, Chip, IconButton, Typography } from '@mui/material';
import type { ReactElement } from 'react';
import { spotlightSx, useSpotlight } from '../../hooks/useSpotlight';
import { fonts } from '../../theme';
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

export interface ProjectCardProps {
  project: Project;
  rootMargin?: string;
}

export default function ProjectCard({ project, rootMargin }: ProjectCardProps) {
  const spotlight = useSpotlight();
  const [lead, ...rest] = project.tags;

  return (
    <RevealSection rootMargin={rootMargin} sx={{ display: 'flex' }}>
      <Card
        onPointerMove={spotlight.onPointerMove}
        sx={[
          (theme) => spotlightSx(theme),
          { display: 'flex', flexDirection: 'column', flex: 1, overflowWrap: 'anywhere' },
        ]}
      >
        <Box sx={{ flex: 1, p: 3 }}>
          {/* header: repo name and repo link */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <BookOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography
              variant="h3"
              component="h3"
              sx={{
                fontFamily: fonts.mono,
                fontSize: '1rem',
                fontWeight: 600,
                color: 'primary.main',
              }}
            >
              {project.name}
            </Typography>
            <Box sx={{ flex: 1 }} />
            <IconButton
              component="a"
              href={project.href}
              target="_blank"
              rel="noreferrer"
              aria-label="View on GitHub"
              size="small"
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              <GitHubIcon fontSize="small" />
            </IconButton>
          </Box>

          <Typography variant="body2" sx={{ mt: 1.5 }}>
            {project.description}
          </Typography>

          {/* category, the lead language dot, then the rest of the stack */}
          <Box sx={{ mt: 2.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75 }}>
            <Chip
              label={project.category}
              size="small"
              variant="outlined"
              sx={{ height: 22, fontSize: '0.72rem', color: 'text.secondary', borderRadius: 999 }}
            />
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                mr: 0.75,
                fontSize: '0.8rem',
                color: 'text.primary',
                fontWeight: 560,
              }}
            >
              <Box
                component="span"
                sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'secondary.main' }}
              />
              {lead}
            </Box>
            {rest.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                sx={{ height: 22, fontSize: '0.72rem', bgcolor: 'codeBg', color: 'text.secondary' }}
              />
            ))}
          </Box>
        </Box>

        {/* external links */}
        {project.links ? (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              px: 3,
              py: 1.75,
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            {project.links.map((link) => (
              <Button
                key={link.href}
                component="a"
                href={link.href}
                target="_blank"
                rel="noreferrer"
                size="small"
                color="inherit"
                startIcon={link.icon ?? <OpenInNewIcon />}
                sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
              >
                {link.label}
              </Button>
            ))}
          </Box>
        ) : null}
      </Card>
    </RevealSection>
  );
}
