import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useScrollProgress } from '../../hooks/useScrollProgress';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { easing, primaryTint } from '../../theme';
import RevealSection from '../common/RevealSection';

export interface Chapter {
  id: string;
  icon: ReactNode;
  title: string;
  body: ReactNode;
  visual: ReactNode;
}

interface ChapterRowProps {
  chapter: Chapter;
  row: number;
  last: boolean;
}

function ChapterRow({ chapter, row, last }: ChapterRowProps) {
  // lit while the chapter is in the upper half of the viewport
  const node = useScrollReveal<HTMLDivElement>({
    once: false,
    threshold: 0,
    rootMargin: '0px 0px -45% 0px',
  });
  const stage = useScrollProgress<HTMLDivElement>({ anchor: 0.75 });

  return (
    <>
      <Box
        ref={node.ref}
        aria-hidden
        data-active={node.visible || undefined}
        sx={{
          gridColumn: 1,
          gridRow: row,
          justifySelf: 'center',
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          placeItems: 'center',
          width: { xs: 36, md: 48 },
          height: { xs: 36, md: 48 },
          mt: { xs: 0.25, md: 0.5 },
          borderRadius: '50%',
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.default',
          color: 'text.secondary',
          '& svg': { fontSize: { xs: 18, md: 22 } },
          transition: `color 0.4s ${easing.reveal}, border-color 0.4s ${easing.reveal}, box-shadow 0.4s ${easing.reveal}`,
          '&[data-active]': {
            color: 'primary.main',
            borderColor: 'primary.main',
            boxShadow: (theme) => `0 8px 28px -6px ${primaryTint(theme, 0.6)}`,
          },
        }}
      >
        {chapter.icon}
      </Box>

      <Box
        ref={stage}
        component="article"
        aria-labelledby={`chapter-${chapter.id}`}
        sx={{ gridColumn: 2, gridRow: row, minWidth: 0, pb: last ? 0 : { xs: 12, md: 18 } }}
      >
        <RevealSection>
          <Typography id={`chapter-${chapter.id}`} variant="h2" sx={{ maxWidth: '16ch' }}>
            {chapter.title}
          </Typography>
        </RevealSection>

        <RevealSection delay={1}>
          <Typography sx={{ mt: 2.5, maxWidth: '58ch', fontSize: { md: '1.12rem' } }}>
            {chapter.body}
          </Typography>
        </RevealSection>

        <RevealSection delay={1} variant="rise" sx={{ mt: { xs: 5, md: 7 } }}>
          {chapter.visual}
        </RevealSection>
      </Box>
    </>
  );
}

export default function ChapterRail({ chapters }: { chapters: Chapter[] }) {
  const rail = useScrollProgress<HTMLDivElement>({ anchor: 0.55 });

  return (
    <Box
      ref={rail}
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '36px minmax(0, 1fr)', md: '48px minmax(0, 1fr)' },
        columnGap: { xs: 2, sm: 3, md: 6 },
      }}
    >
      {/* the track, and the light that runs down it as you read */}
      <Box
        aria-hidden
        sx={{
          gridColumn: 1,
          gridRow: `1 / span ${chapters.length}`,
          justifySelf: 'center',
          position: 'relative',
          width: 2,
          mt: 3,
          borderRadius: 1,
          bgcolor: 'divider',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: 1,
            transformOrigin: 'top',
            transform: 'scaleY(var(--progress, 0))',
            background: (theme) => {
              const { palette } = theme.vars ?? theme;

              return `linear-gradient(180deg, ${palette.primary.main}, ${palette.secondary.main} 55%, ${palette.success.main})`;
            },
            boxShadow: (theme) => `0 0 16px ${primaryTint(theme, 0.55)}`,
          }}
        />
      </Box>

      {chapters.map((chapter, i) => (
        <ChapterRow
          key={chapter.id}
          chapter={chapter}
          row={i + 1}
          last={i === chapters.length - 1}
        />
      ))}
    </Box>
  );
}
