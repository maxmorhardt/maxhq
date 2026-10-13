import { Box, type BoxProps } from '@mui/material';
import type { ElementType, ReactNode } from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { easing } from '../../theme';

export type RevealVariant = 'up' | 'left' | 'scale' | 'rise';

// the offset each variant animates in from
const hiddenTransform: Record<RevealVariant, string> = {
  up: 'translateY(24px)',
  left: 'translateX(-40px)',
  scale: 'scale(0.9)',
  rise: 'translateY(48px) scale(0.96)',
};

export interface RevealSectionProps extends Omit<BoxProps, 'ref'> {
  delay?: 0 | 1 | 2 | 3 | 4;
  variant?: RevealVariant;
  component?: ElementType;
  threshold?: number;
  rootMargin?: string;
  children?: ReactNode;
}

export default function RevealSection({
  delay = 0,
  variant = 'up',
  threshold,
  rootMargin,
  children,
  sx,
  ...rest
}: RevealSectionProps) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>({ threshold, rootMargin });

  return (
    <Box
      ref={ref}
      data-visible={visible || undefined}
      sx={[
        {
          opacity: visible ? 1 : 0,
          transform: visible ? 'none' : hiddenTransform[variant],
          transition: `opacity 0.7s ${easing.reveal}, transform 0.7s ${easing.reveal}`,
          transitionDelay: delay ? `${delay * 100}ms` : undefined,
          willChange: 'opacity, transform',
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
            transform: 'none',
            opacity: 1,
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    >
      {children}
    </Box>
  );
}
