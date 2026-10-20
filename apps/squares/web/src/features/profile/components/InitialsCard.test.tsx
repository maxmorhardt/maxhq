import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockMutation } from '../../../test/auth';
import { renderWithProviders } from '../../../test/render';
import InitialsCard from './InitialsCard';

const api = vi.hoisted(() => ({ useUpdateMyProfileMutation: vi.fn() }));
vi.mock('../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));

describe('InitialsCard', () => {
  let update: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const [trigger, state] = mockMutation({});
    update = trigger;
    api.useUpdateMyProfileMutation.mockReturnValue([trigger, state]);
  });

  it('shows the current initials', () => {
    renderWithProviders(<InitialsCard initials="AB" disabled={false} />);
    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  it('cleans up and saves new initials', async () => {
    const { store } = renderWithProviders(<InitialsCard initials="AB" disabled={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Initials'), { target: { value: 'x-y.z9' } });
    expect(screen.getByLabelText('Initials')).toHaveValue('XYZ');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument());
    expect(update).toHaveBeenCalledWith({ defaultInitials: 'XYZ' });
    expect(store.getState().toast.messages[0]?.severity).toBe('success');
  });

  it('keeps editing when the save fails', async () => {
    api.useUpdateMyProfileMutation.mockReturnValue(
      mockMutation({ error: { status: 400, message: 'x' } })
    );
    const { store } = renderWithProviders(<InitialsCard initials="AB" disabled={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(store.getState().toast.messages[0]?.severity).toBe('error'));
    expect(screen.getByLabelText('Initials')).toBeInTheDocument();
  });

  it('cancels without saving and can be disabled', () => {
    const { rerender } = renderWithProviders(
      <InitialsCard initials={undefined} disabled={false} />
    );
    expect(screen.getByText('—')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(update).not.toHaveBeenCalled();

    rerender(<InitialsCard initials="AB" disabled />);
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
  });
});
