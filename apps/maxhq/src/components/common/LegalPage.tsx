import { Box, Container, List, ListItem, ListItemText, Typography } from '@mui/material';
import { pageSection } from '../../theme';
import PageHeader from './PageHeader';
import SectionNav from './SectionNav';

export interface LegalSection {
  title: string;
  content: string | string[];
}

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

const slug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// "1. Introduction" reads as "Introduction" in the contents list
const shortTitle = (title: string) => title.replace(/^\d+\.\s*/, '');

export default function LegalPage({ title, lastUpdated, sections }: LegalPageProps) {
  return (
    <Box>
      <PageHeader title={title} lede={`Last updated: ${lastUpdated}`} />

      <Container
        maxWidth="lg"
        sx={{
          pb: pageSection.py,
          display: 'grid',
          gridTemplateColumns: { md: '230px minmax(0, 1fr)' },
          gap: { md: 8 },
          alignItems: 'start',
        }}
      >
        <SectionNav
          title="Contents"
          items={sections.map((section) => ({
            id: slug(section.title),
            label: shortTitle(section.title),
          }))}
        />

        <Box sx={{ minWidth: 0, maxWidth: 720 }}>
          {sections.map((section) => (
            <Box
              key={section.title}
              component="section"
              id={slug(section.title)}
              sx={{ py: 3.5, borderTop: 1, borderColor: 'divider' }}
            >
              <Typography variant="h3" component="h2" sx={{ mb: 1.5, fontSize: '1.2rem' }}>
                {section.title}
              </Typography>

              {Array.isArray(section.content) ? (
                <>
                  {/* lead paragraph plus optional bullet list */}
                  {section.content.length > 0 ? (
                    <Typography sx={{ lineHeight: 1.75 }}>{section.content[0]}</Typography>
                  ) : null}

                  {section.content.length > 1 ? (
                    <List dense sx={{ listStyleType: 'disc', pl: 3, py: 0.5 }}>
                      {section.content.slice(1).map((item) => (
                        <ListItem
                          key={item}
                          sx={{
                            display: 'list-item',
                            px: 0,
                            py: 0.25,
                            '&::marker': { color: 'var(--mui-palette-primary-main)' },
                          }}
                        >
                          <ListItemText
                            primary={item}
                            slotProps={{
                              primary: { color: 'text.secondary', sx: { lineHeight: 1.75 } },
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : null}
                </>
              ) : (
                <Typography sx={{ lineHeight: 1.75 }}>{section.content}</Typography>
              )}
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
