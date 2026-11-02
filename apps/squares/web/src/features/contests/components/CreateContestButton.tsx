import { Add, ArrowForward } from '@mui/icons-material';
import { Button, type ButtonProps } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { game } from '../../../app/theme';
import { useStartContest } from '../useStartContest';

type Look = 'primary' | 'header' | 'link';

interface Props {
  look?: Look;
  label?: string;
  gameId?: string;
}

const looks: Record<Look, ButtonProps> = {
  primary: { variant: 'contained', size: 'large', endIcon: <ArrowForward /> },
  header: {
    size: 'small',
    startIcon: <Add />,
    sx: {
      px: 1.5,
      color: game.brand,
      bgcolor: alpha(game.brand, 0.12),
      border: `1px solid ${alpha(game.brand, 0.32)}`,
      '&:hover': { bgcolor: alpha(game.brand, 0.2), borderColor: game.brand },
    },
  },
  link: {
    size: 'small',
    endIcon: <ArrowForward />,
    sx: { px: 0.75, color: game.brand, '&:hover': { bgcolor: alpha(game.brand, 0.08) } },
  },
};

export default function CreateContestButton({
  look = 'primary',
  label = 'Create a Contest',
  gameId,
}: Props) {
  const { start, signInDialog } = useStartContest(gameId);
  const { sx, ...buttonProps } = looks[look];

  return (
    <>
      <Button
        {...buttonProps}
        onClick={start}
        sx={[{ whiteSpace: 'nowrap' }, ...(Array.isArray(sx) ? sx : [sx])]}
      >
        {label}
      </Button>
      {signInDialog}
    </>
  );
}
