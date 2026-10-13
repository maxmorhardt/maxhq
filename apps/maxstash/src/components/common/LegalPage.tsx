import { Box, Container, List, ListItem, ListItemText, Typography } from '@mui/material';
import { layout, pageSection } from '../../theme';

export interface LegalSection {
  title: string;
  content: string | string[];
}

export interface LegalPageProps {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export default function LegalPage({ title, lastUpdated, sections }: LegalPageProps) {
  return (
    <Box component="section" sx={pageSection}>
      <Container sx={{ maxWidth: { sm: layout.proseWidth } }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {title}
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 5, opacity: 0.8 }}>
          Last updated: {lastUpdated}
        </Typography>

        {sections.map((section) => (
          <Box key={section.title} sx={{ mb: 4 }}>
            <Typography variant="h3" component="h2" sx={{ mb: 1, fontSize: '1.15rem' }}>
              {section.title}
            </Typography>

            {Array.isArray(section.content) ? (
              <>
                {/* lead paragraph plus optional bullet list */}
                {section.content.length > 0 ? (
                  <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {section.content[0]}
                  </Typography>
                ) : null}

                {section.content.length > 1 ? (
                  <List dense sx={{ listStyleType: 'disc', pl: 3, py: 0 }}>
                    {section.content.slice(1).map((item) => (
                      <ListItem key={item} sx={{ display: 'list-item', px: 0, py: 0.25 }}>
                        <ListItemText
                          primary={item}
                          slotProps={{
                            primary: { color: 'text.secondary', sx: { lineHeight: 1.7 } },
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : null}
              </>
            ) : (
              <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
                {section.content}
              </Typography>
            )}
          </Box>
        ))}
      </Container>
    </Box>
  );
}
