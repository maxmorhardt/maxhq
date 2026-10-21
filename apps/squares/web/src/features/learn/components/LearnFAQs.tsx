import { Add } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary, Typography } from '@mui/material';

interface LearnFAQsProps {
  question: string;
  answer: string;
}

export default function LearnFAQs({ question, answer }: LearnFAQsProps) {
  return (
    <Accordion
      disableGutters
      elevation={0}
      slotProps={{ transition: { timeout: 200 } }}
      sx={{
        bgcolor: 'transparent',
        borderBottom: 1,
        borderColor: 'divider',
        borderRadius: '0 !important',
        '&:first-of-type': { borderTop: 1, borderColor: 'divider' },
        '& .MuiAccordionSummary-expandIconWrapper': { color: 'primary.main' },
        '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': { transform: 'rotate(45deg)' },
      }}
    >
      <AccordionSummary
        expandIcon={<Add />}
        sx={{ px: 0, '& .MuiAccordionSummary-content': { margin: '20px 0' } }}
      >
        <Typography sx={{ fontWeight: 600, fontSize: '1.08rem', pr: 2 }}>{question}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 0, pt: 0, pb: 3 }}>
        <Typography sx={{ color: 'text.secondary', lineHeight: 1.7, maxWidth: '66ch' }}>
          {answer}
        </Typography>
      </AccordionDetails>
    </Accordion>
  );
}
