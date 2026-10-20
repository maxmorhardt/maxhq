import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockMutation } from '../../../../test/auth';
import { makeContest, makeQuarterResult } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import ScoreUpdateControls from './ScoreUpdateControls';

const api = vi.hoisted(() => ({ useRecordQuarterResultMutation: vi.fn() }));
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));

const contest = makeContest({ status: 'Q1', homeTeam: 'Lions', awayTeam: 'Bears' });

describe('ScoreUpdateControls', () => {
  beforeEach(() => {
    api.useRecordQuarterResultMutation.mockReturnValue(mockMutation(makeQuarterResult()));
  });

  it('labels the score fields with the teams', () => {
    renderWithProviders(<ScoreUpdateControls contest={contest} />);
    expect(screen.getByLabelText('Lions')).toBeInTheDocument();
    expect(screen.getByLabelText('Bears')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update Score' })).toBeDisabled();
  });

  it('records the quarter and clears the fields', async () => {
    const [record, state] = mockMutation(makeQuarterResult());
    api.useRecordQuarterResultMutation.mockReturnValue([record, state]);
    const { store } = renderWithProviders(<ScoreUpdateControls contest={contest} />);

    fireEvent.change(screen.getByLabelText('Lions'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Bears'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Score' }));

    await waitFor(() => expect(screen.getByLabelText('Lions')).toHaveValue(null));
    expect(record).toHaveBeenCalledWith({
      contestId: 'c-1',
      request: { homeTeamScore: 7, awayTeamScore: 3 },
    });
    expect(store.getState().toast.messages[0]?.severity).toBe('success');
  });

  it('ignores scores longer than four digits', () => {
    renderWithProviders(<ScoreUpdateControls contest={contest} />);
    fireEvent.change(screen.getByLabelText('Lions'), { target: { value: '12345' } });
    expect(screen.getByLabelText('Lions')).toHaveValue(null);
  });

  it('reports a failure and keeps the scores', async () => {
    api.useRecordQuarterResultMutation.mockReturnValue(
      mockMutation({ error: { status: 409, message: 'Already scored' } })
    );
    const { store } = renderWithProviders(
      <ScoreUpdateControls contest={makeContest({ status: 'Q1' })} />
    );

    fireEvent.change(screen.getByLabelText('Home'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Away'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Score' }));

    await waitFor(() => expect(store.getState().toast.messages[0]?.message).toBe('Already scored'));
    expect(screen.getByLabelText('Home')).toHaveValue(7);
  });
});
