import GitHubIcon from '@mui/icons-material/GitHub';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  IconButton,
  Typography,
} from '@mui/material';
import type { ReactElement } from 'react';
import RevealSection from '../common/RevealSection';
import { fonts } from '../../theme';

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
  return (
    <RevealSection rootMargin={rootMargin} sx={{ display: 'flex' }}>
      <Card
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflowWrap: 'anywhere',
          '&:hover': { transform: 'translateY(-4px)', borderColor: 'primary.main' },
          '@media (prefers-reduced-motion: reduce)': { '&:hover': { transform: 'none' } },
        }}
      >
        <CardContent sx={{ flex: 1 }}>
          {/* header: name, category, repo link */}
          <Box
            sx={{
              mb: 1,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
              <Typography variant="h3" component="h3" sx={{ fontFamily: fonts.mono }}>
                {project.name}
              </Typography>
              <Chip label={project.category} size="small" color="primary" variant="outlined" />
            </Box>

            <IconButton
              component="a"
              href={project.href}
              target="_blank"
              rel="noreferrer"
              aria-label="View on GitHub"
              size="small"
            >
              <GitHubIcon />
            </IconButton>
          </Box>

          <Typography variant="body2" color="text.secondary">
            {project.description}
          </Typography>

          {/* tags */}
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {project.tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
          </Box>
        </CardContent>

        {/* external links */}
        {project.links ? (
          <CardActions sx={{ px: 2, pb: 2, gap: 1, flexWrap: 'wrap' }}>
            {project.links.map((link) => (
              <Button
                key={link.href}
                component="a"
                href={link.href}
                target="_blank"
                rel="noreferrer"
                size="small"
                variant="outlined"
                startIcon={link.icon ?? <OpenInNewIcon />}
              >
                {link.label}
              </Button>
            ))}
          </CardActions>
        ) : null}
      </Card>
    </RevealSection>
  );
}
