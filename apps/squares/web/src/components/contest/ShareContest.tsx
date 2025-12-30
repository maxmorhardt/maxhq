import { Share } from '@mui/icons-material';
import { Button, Typography } from '@mui/material';

interface ShareContestProps {
  contestName: string;
}

export default function ShareContest({ contestName }: ShareContestProps) {
  const handleShare = async () => {
    const shareUrl = window.location.href;

    // fallback to clipboard copy
    if (!navigator.share) {
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }

      return;
    }

    try {
      await navigator.share({
        title: contestName,
        text: `Join my squares contest: ${contestName || 'Contest'}`,
        url: shareUrl,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <Button variant="outlined" onClick={handleShare} startIcon={<Share />}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        Share Contest
      </Typography>
    </Button>
  );
}
