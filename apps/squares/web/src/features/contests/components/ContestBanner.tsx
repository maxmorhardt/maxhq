import { Box, Button, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { game as palette } from '../../../app/theme';

export interface BannerAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

interface Props {
  message: string;
  icon?: ReactNode;
  header?: ReactNode;
  action?: BannerAction;
}

export default function ContestBanner({ message, icon, header, action }: Props) {
  return (
    <Box
      role="status"
      sx={{
        borderRadius: '14px',
        border: 1,
        borderColor: alpha(palette.brand, 0.45),
        bgcolor: alpha(palette.brand, 0.06),
        px: { xs: 1.75, sm: 2 },
        py: 1.5,
      }}
    >
      {header && <Box sx={{ mb: 1.25 }}>{header}</Box>}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          columnGap: 1.5,
          rowGap: 1.25,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: '1 1 240px' }}>
          {icon && (
            <Box
              aria-hidden
              sx={{ display: 'flex', color: 'primary.main', '& svg': { fontSize: '1.3rem' } }}
            >
              {icon}
            </Box>
          )}
          <Typography sx={{ fontSize: '0.9rem', lineHeight: 1.45 }}>{message}</Typography>
        </Box>
        {action && (
          <Button
            variant="contained"
            size="small"
            startIcon={action.icon}
            onClick={action.onClick}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {action.label}
          </Button>
        )}
      </Box>
    </Box>
  );
}
