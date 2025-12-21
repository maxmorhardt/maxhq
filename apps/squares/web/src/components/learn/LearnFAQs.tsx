import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary, Typography, useTheme } from '@mui/material';

interface LearnFAQsProps {
  question: string;
  answer: string;
}

export default function LearnFAQs({ question, answer }: LearnFAQsProps) {
  const theme = useTheme();

  return (
    // expandable accordion for FAQ item
    <Accordion
      sx={{
        background: theme.palette.grey[900],
        border: `1px solid ${theme.palette.grey[800]}`,
        borderRadius: '12px !important',
        mb: 2,
      }}
    >
      {/* question header with expand icon */}
      <AccordionSummary
        expandIcon={<ExpandMore sx={{ color: 'white' }} />}
        sx={{
          '& .MuiAccordionSummary-content': {
            margin: '16px 0',
          },
        }}
      >
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
          {question}
        </Typography>
      </AccordionSummary>
      {/* answer text content */}
      <AccordionDetails>
        <Typography sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>{answer}</Typography>
      </AccordionDetails>
    </Accordion>
  );
}
