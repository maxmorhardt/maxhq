import { Box, Link, Typography } from '@mui/material';
import { useActiveSection } from '../../hooks/useActiveSection';
import { easing } from '../../theme';

export interface SectionNavItem {
  id: string;
  label: string;
}

export interface SectionNavProps {
  items: SectionNavItem[];
  title: string;
}

// a sticky on-this-page list that tracks the section being read
export default function SectionNav({ items, title }: SectionNavProps) {
  const active = useActiveSection(items.map((item) => item.id));

  return (
    <Box
      component="nav"
      aria-label={title}
      sx={{ position: 'sticky', top: 100, display: { xs: 'none', md: 'block' } }}
    >
      <Typography sx={{ mb: 1.5, color: 'text.primary', fontWeight: 620, fontSize: '0.86rem' }}>
        {title}
      </Typography>
      <Box sx={{ position: 'relative', borderLeft: 1, borderColor: 'divider' }}>
        {items.map((item) => {
          const current = item.id === active;

          return (
            <Link
              key={item.id}
              href={`#${item.id}`}
              underline="none"
              aria-current={current ? 'location' : undefined}
              sx={{
                position: 'relative',
                display: 'block',
                py: 0.75,
                pl: 2,
                ml: '-1px',
                fontSize: '0.88rem',
                lineHeight: 1.4,
                color: current ? 'text.primary' : 'text.secondary',
                fontWeight: current ? 600 : 500,
                transition: `color 200ms ${easing.reveal}`,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 6,
                  bottom: 6,
                  width: 2,
                  borderRadius: 1,
                  bgcolor: 'primary.main',
                  transform: current ? 'scaleY(1)' : 'scaleY(0)',
                  transition: `transform 300ms ${easing.reveal}`,
                },
                '&:hover': { color: 'text.primary' },
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </Box>
    </Box>
  );
}
