import { Box, type BoxProps } from '@mui/material';
import type { ElementType, ReactNode } from 'react';
import { easing } from '../app/theme';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

interface Props extends Omit<BoxProps, 'ref'> {
  delay?: number;
  component?: ElementType;
  children?: ReactNode;
}

// fades content up into place the first time it scrolls into view
export default function Reveal({ delay = 0, children, sx, ...rest }: Props) {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <Box
      ref={ref}
      data-visible={isVisible || undefined}
      sx={[
        {
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'none' : 'translateY(18px)',
          transition: `opacity 700ms ${easing.out} ${delay}ms, transform 700ms ${easing.out} ${delay}ms`,
          '@media (prefers-reduced-motion: reduce)': {
            opacity: 1,
            transform: 'none',
            transition: 'none',
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
