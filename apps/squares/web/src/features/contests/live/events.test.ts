import { describe, expect, it } from 'vitest';
import { parseContestEvent } from './events';

const envelope = (fields: Record<string, unknown>) =>
  JSON.stringify({
    contestId: 'c-1',
    updatedBy: 'u',
    timestamp: '2026-01-01T00:00:00Z',
    ...fields,
  });

describe('parseContestEvent', () => {
  it('accepts a known event for this contest', () => {
    const parsed = parseContestEvent(
      envelope({ type: 'square.updated', data: { id: 's' } }),
      'c-1'
    );
    expect(parsed).toMatchObject({ kind: 'event', event: { type: 'square.updated' } });
  });

  it('skips event types it does not know yet', () => {
    expect(parseContestEvent(envelope({ type: 'contest.renamed' }), 'c-1')).toEqual({
      kind: 'unknown',
      type: 'contest.renamed',
    });
  });

  it('rejects malformed json, non-objects, missing types, and other contests', () => {
    expect(parseContestEvent('{nope', 'c-1')).toEqual({ kind: 'invalid' });
    expect(parseContestEvent('42', 'c-1')).toEqual({ kind: 'invalid' });
    expect(parseContestEvent(envelope({}), 'c-1')).toEqual({ kind: 'invalid' });
    expect(parseContestEvent(envelope({ type: 'square.updated' }), 'c-2')).toEqual({
      kind: 'invalid',
    });
  });
});
