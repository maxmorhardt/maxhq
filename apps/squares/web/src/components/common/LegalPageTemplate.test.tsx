import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import LegalPageTemplate from './LegalPageTemplate';
import type { LegalSection } from './LegalPageTemplate';

const theme = createTheme({ palette: { mode: 'dark' } });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

const stringSections: LegalSection[] = [
  { title: 'Introduction', content: 'This is the introduction paragraph.' },
  { title: 'Usage', content: 'Use responsibly.' },
];

const arraySections: LegalSection[] = [
  { title: 'Your Rights', content: ['Right to access', 'Right to delete', 'Right to correct'] },
];

describe('LegalPageTemplate', () => {
  it('renders the page title', () => {
    render(
      <LegalPageTemplate
        title="Privacy Policy"
        lastUpdated="January 1, 2024"
        sections={stringSections}
      />,
      { wrapper }
    );
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  it('renders the last updated date', () => {
    render(
      <LegalPageTemplate
        title="Privacy Policy"
        lastUpdated="January 1, 2024"
        sections={stringSections}
      />,
      { wrapper }
    );
    expect(screen.getByText(/January 1, 2024/)).toBeInTheDocument();
  });

  it('renders string section titles and content', () => {
    render(
      <LegalPageTemplate
        title="Privacy Policy"
        lastUpdated="January 1, 2024"
        sections={stringSections}
      />,
      { wrapper }
    );
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('This is the introduction paragraph.')).toBeInTheDocument();
    expect(screen.getByText('Usage')).toBeInTheDocument();
    expect(screen.getByText('Use responsibly.')).toBeInTheDocument();
  });

  it('renders array section content as a bullet list', () => {
    render(
      <LegalPageTemplate title="Terms" lastUpdated="January 1, 2024" sections={arraySections} />,
      { wrapper }
    );
    expect(screen.getByText('Right to access')).toBeInTheDocument();
    expect(screen.getByText('Right to delete')).toBeInTheDocument();
    expect(screen.getByText('Right to correct')).toBeInTheDocument();
  });

  it('renders multiple sections', () => {
    render(
      <LegalPageTemplate
        title="Privacy Policy"
        lastUpdated="January 1, 2024"
        sections={stringSections}
      />,
      { wrapper }
    );
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Usage')).toBeInTheDocument();
  });
});
