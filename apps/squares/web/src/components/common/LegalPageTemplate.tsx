import { Box, Container, Typography, Divider, Paper, useTheme } from '@mui/material';

export interface LegalSection {
  title: string;
  content: string | string[];
}

interface LegalPageTemplateProps {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export default function LegalPageTemplate({
  title,
  lastUpdated,
  sections,
}: LegalPageTemplateProps) {
  const theme = useTheme();

  const renderContent = (content: string | string[]) => {
    // render single paragraph for string content
    if (typeof content === 'string') {
      return (
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.8 }}>
          {content}
        </Typography>
      );
    }

    // render bullet list for array content
    return (
      <Box component="ul" sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 2, pl: 3 }}>
        {content.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </Box>
    );
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* page header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        {/* title */}
        <Typography
          variant="h2"
          sx={{
            fontWeight: 700,
            mb: 2,
            color: 'white',
            fontSize: { xs: '2.25rem', md: '3rem' },
          }}
        >
          {title}
        </Typography>

        {/* last updated date */}
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          Last updated: {lastUpdated}
        </Typography>
      </Box>

      {/* content container */}
      <Paper
        sx={{
          background: theme.palette.grey[900],
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 3,
          p: { xs: 3, md: 4 },
        }}
      >
        {/* sections list */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {sections.map((section, index) => (
            <Box key={index}>
              {/* section title */}
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                {section.title}
              </Typography>

              {/* section content */}
              {renderContent(section.content)}

              {/* add divider between sections except after the last one */}
              {index < sections.length - 1 && (
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mt: 3 }} />
              )}
            </Box>
          ))}
        </Box>
      </Paper>
    </Container>
  );
}
