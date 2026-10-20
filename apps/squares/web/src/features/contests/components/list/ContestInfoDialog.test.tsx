import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../test/render';
import type { ContestSummary } from '../../../../types/contest';
import ContestInfoDialog from './ContestInfoDialog';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => ({
  ...(await vi.importActual<typeof import('react-router')>('react-router')),
  useNavigate: () => mockNavigate,
}));

const contest: ContestSummary = {
  id: 'c-1',
  name: 'Office Pool',
  homeTeam: 'Lions',
  awayTeam: 'Bears',
  homeAbbr: 'DET',
  awayAbbr: 'CHI',
  gameTime: '2026-11-01T18:00:00Z',
  status: 'ACTIVE',
  visibility: 'private',
  owner: 'owner@x.com',
  role: 'owner',
  claimedSquares: 42,
  mySquares: 6,
  version: 3,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function renderDialog(overrides: Partial<ContestSummary> = {}) {
  const onDelete = vi.fn();
  renderWithProviders(
    <ContestInfoDialog
      contest={{ ...contest, ...overrides }}
      onClose={vi.fn()}
      onDelete={onDelete}
    />
  );
  return { onDelete };
}

describe('ContestInfoDialog', () => {
  it('renders nothing without a contest', () => {
    renderWithProviders(<ContestInfoDialog contest={null} onClose={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the contest settings without anything to edit', () => {
    renderDialog();
    expect(screen.getByRole('dialog', { name: 'Office Pool' })).toBeInTheDocument();
    expect(screen.getByText('Bears @ Lions')).toBeInTheDocument();
    expect(screen.getByText('Private')).toBeInTheDocument();
    expect(screen.getByText('42 of 100')).toBeInTheDocument();
    expect(screen.getByText('owner@x.com')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('opens the contest', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Open Contest' }));
    expect(mockNavigate).toHaveBeenCalledWith('/contests/c-1');
  });

  it('lets the owner delete an open contest', () => {
    const { onDelete } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-1' }));
  });

  it('offers no delete to players or on finished contests', () => {
    renderDialog({ role: 'participant' });
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('shows dashes when the game is unknown', () => {
    renderDialog({
      homeTeam: undefined,
      awayTeam: undefined,
      gameTime: undefined,
      status: 'FINISHED',
    });
    expect(screen.getAllByText('–')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });
});
