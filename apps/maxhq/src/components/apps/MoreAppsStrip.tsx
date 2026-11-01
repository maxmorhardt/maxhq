import AddIcon from '@mui/icons-material/Add';
import { Box, Typography } from '@mui/material';
import RevealSection from '../common/RevealSection';

export default function MoreAppsStrip() {
  return (
    <RevealSection
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { sm: 'center' },
        gap: { xs: 2, sm: 2.5 },
        px: { xs: 3, md: 4 },
        py: { xs: 3, md: 3.5 },
        borderRadius: '22px',
        border: 1,
        borderStyle: 'dashed',
        borderColor: 'divider',
      }}
    >
      <Box
        aria-hidden
        sx={{
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          width: 48,
          height: 48,
          borderRadius: '14px',
          border: 1,
          borderStyle: 'dashed',
          borderColor: 'divider',
          color: 'text.secondary',
        }}
      >
        <AddIcon />
      </Box>
      <Box>
        <Typography variant="h3">More apps on the way</Typography>
        <Typography sx={{ mt: 0.5 }}>
          New apps land here as they launch, and the same maxhq account signs you in to all of them.
        </Typography>
      </Box>
    </RevealSection>
  );
}
