import { createTheme } from '@mui/material';

export const theme = createTheme({
  palette: {
    mode: 'dark',
  },
  // turn off mui's uppercase buttons app-wide, including the hydration shell
  typography: {
    button: {
      textTransform: 'none',
    },
  },
  components: {
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: Number(theme.shape.borderRadius) * 3,
          border: '1px solid rgba(255,255,255,0.1)',
        }),
      },
    },
  },
});
