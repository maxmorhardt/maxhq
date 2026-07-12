import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeleteAccountDialog from './DeleteAccountDialog';
import type { UserActiveContest } from '../../types/user';

function baseProps() {
  return {
    open: true,
    deleting: false,
    busyId: null,
    activeContests: [] as UserActiveContest[] | null,
    activeContestsError: false,
    onClose: vi.fn(),
    onRetry: vi.fn(),
    onDeleteContest: vi.fn(),
    onLeaveContest: vi.fn(),
    onConfirmDelete: vi.fn(),
  };
}

describe('DeleteAccountDialog', () => {
  it('renders nothing when closed', () => {
    render(<DeleteAccountDialog {...baseProps()} open={false} />);
    expect(screen.queryByText(/delete your account\?/i)).not.toBeInTheDocument();
  });

  it('shows a spinner and only a cancel action while the preflight is loading', () => {
    render(<DeleteAccountDialog {...baseProps()} activeContests={null} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete forever/i })).not.toBeInTheDocument();
  });

  it('shows the error state and retries', () => {
    const props = baseProps();
    render(<DeleteAccountDialog {...props} activeContests={null} activeContestsError />);
    expect(screen.getByText(/couldn't verify/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(props.onRetry).toHaveBeenCalled();
  });

  it('lists blocking contests with owner delete and participant leave actions', () => {
    const props = baseProps();
    const active: UserActiveContest[] = [
      { id: 'c1', name: 'pool', owner: 'a@b.com', role: 'owner' },
      { id: 'c2', name: 'office', owner: 'other@b.com', role: 'participant' },
    ];
    render(<DeleteAccountDialog {...props} activeContests={active} />);

    expect(screen.getByText(/finish your contests first/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(props.onDeleteContest).toHaveBeenCalledWith('c1');
    fireEvent.click(screen.getByRole('button', { name: /leave/i }));
    expect(props.onLeaveContest).toHaveBeenCalledWith('c2');
  });

  it('confirms deletion when there are no active contests', () => {
    const props = baseProps();
    render(<DeleteAccountDialog {...props} activeContests={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /delete forever/i }));
    expect(props.onConfirmDelete).toHaveBeenCalled();
  });

  it('disables the confirm action while deleting', () => {
    render(<DeleteAccountDialog {...baseProps()} deleting />);
    expect(screen.getByRole('button', { name: /delete forever/i })).toBeDisabled();
  });
});
