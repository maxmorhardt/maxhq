import { Box, Paper, Typography } from '@mui/material';
import { fonts } from '../app/theme';
import SignInOptions from './SignInOptions';

interface Props {
  title: string;
  description: string;
}

// what a signed-out visitor sees on a page that needs an account, in place of an error
export default function SignInPrompt({ title, description }: Props) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 2, md: 4 } }}>
      <Paper
        variant="outlined"
        sx={{ width: '100%', maxWidth: 440, p: { xs: 3, sm: 4 }, borderRadius: '18px' }}
      >
        <Typography
          component="h2"
          sx={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: '1.9rem',
            lineHeight: 1.05,
            textTransform: 'uppercase',
          }}
        >
          {title}
        </Typography>
        <Typography sx={{ mt: 1.25, mb: 3, color: 'text.secondary' }}>{description}</Typography>
        <SignInOptions />
      </Paper>
    </Box>
  );
}
