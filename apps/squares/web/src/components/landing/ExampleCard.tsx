import { Paper, Typography, useTheme } from '@mui/material';
import type { ReactNode } from 'react';

interface ExampleCardProps {
  title: string;
  children: ReactNode;
  isCentered?: boolean;
}

export default function ExampleCard({ title, children, isCentered = false }: ExampleCardProps) {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        borderRadius: 3,
        backgroundColor: theme.customBackgrounds.glass.medium,
        backdropFilter: theme.customFilters.blurMedium,
        border: theme.customBorders.glass,
        textAlign: isCentered ? 'center' : 'left',
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'white' }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}
