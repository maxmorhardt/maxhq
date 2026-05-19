import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import ActivityFeed from './ActivityFeed';
import type { ActivityEvent } from '../../../types/contest';

const theme = createTheme();

function renderFeed(events: ActivityEvent[] = []) {
  return render(
    <ThemeProvider theme={theme}>
      <ActivityFeed events={events} />
    </ThemeProvider>
  );
}

const sampleEvents: ActivityEvent[] = [
  {
    id: '1',
    type: 'square_claimed',
    message: 'Alice claimed a square',
    timestamp: '2025-01-01T12:00:00Z',
  },
  {
    id: '2',
    type: 'score_update',
    message: 'Score updated: 7-14',
    timestamp: '2025-01-01T12:01:00Z',
  },
];

describe('ActivityFeed', () => {
  it('renders the "Activity Feed" heading', () => {
    renderFeed([]);
    expect(screen.getByText('Activity Feed')).toBeInTheDocument();
  });

  it('shows "No activity yet" when the events list is empty', () => {
    renderFeed([]);
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
  });

  it('renders event messages', () => {
    renderFeed(sampleEvents);
    expect(screen.getByText('Alice claimed a square')).toBeInTheDocument();
    expect(screen.getByText('Score updated: 7-14')).toBeInTheDocument();
  });
});
