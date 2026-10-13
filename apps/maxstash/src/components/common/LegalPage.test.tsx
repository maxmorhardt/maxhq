import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LegalPage, { type LegalSection } from './LegalPage';
import { renderWithProviders } from '../../testUtils';

const sections: LegalSection[] = [
  { title: 'Plain section', content: 'A single paragraph of prose.' },
  {
    title: 'List section',
    content: ['Lead paragraph:', 'First bullet', 'Second bullet'],
  },
  { title: 'Empty list section', content: [] },
];

describe('LegalPage', () => {
  it('renders the title and last updated date', () => {
    renderWithProviders(
      <LegalPage title="Privacy Policy" lastUpdated="July 12, 2026" sections={sections} />
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByText('Last updated: July 12, 2026')).toBeInTheDocument();
  });

  it('renders a heading per section', () => {
    renderWithProviders(<LegalPage title="T" lastUpdated="D" sections={sections} />);

    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3);
  });

  it('renders string content as a single paragraph', () => {
    renderWithProviders(<LegalPage title="T" lastUpdated="D" sections={sections} />);

    expect(screen.getByText('A single paragraph of prose.')).toBeInTheDocument();
  });

  it('renders array content as a lead paragraph plus bullets', () => {
    renderWithProviders(<LegalPage title="T" lastUpdated="D" sections={sections} />);

    expect(screen.getByText('Lead paragraph:')).toBeInTheDocument();

    const list = screen.getByRole('list');
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent)
    ).toEqual(['First bullet', 'Second bullet']);
  });

  it('renders no list for an empty content array', () => {
    renderWithProviders(
      <LegalPage title="T" lastUpdated="D" sections={[{ title: 'Only', content: [] }]} />
    );

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
