import { describe, it, expect } from 'vitest';
import {
  getStatusOption,
  getStatusLabel,
  isInGameStatus,
  isTerminalStatus,
  statusOptions,
} from './contestStatus';
import type { ContestStatus } from '../types/contest';

describe('statusOptions', () => {
  it('should contain all contest statuses', () => {
    const values = statusOptions.map((o) => o.value);
    expect(values).toEqual(['ACTIVE', 'Q1', 'Q2', 'Q3', 'Q4', 'FINISHED', 'DELETED']);
  });

  it('should have label, description, and color for each option', () => {
    for (const option of statusOptions) {
      expect(option.label).toBeTruthy();
      expect(option.description).toBeTruthy();
      expect(option.color).toMatch(/^#[0-9a-f]+$/i);
    }
  });
});

describe('getStatusOption', () => {
  it('should return the matching option for each status', () => {
    expect(getStatusOption('ACTIVE').value).toBe('ACTIVE');
    expect(getStatusOption('Q1').value).toBe('Q1');
    expect(getStatusOption('Q2').value).toBe('Q2');
    expect(getStatusOption('Q3').value).toBe('Q3');
    expect(getStatusOption('Q4').value).toBe('Q4');
    expect(getStatusOption('FINISHED').value).toBe('FINISHED');
    expect(getStatusOption('DELETED').value).toBe('DELETED');
  });

  it('should return the first option (ACTIVE) for falsy status', () => {
    const result = getStatusOption('' as ContestStatus);
    expect(result.value).toBe('ACTIVE');
  });

  it('should return the first option for unknown status', () => {
    const result = getStatusOption('UNKNOWN' as ContestStatus);
    expect(result.value).toBe('ACTIVE');
  });
});

describe('getStatusLabel', () => {
  it('should return the label for each status', () => {
    expect(getStatusLabel('ACTIVE')).toBe('Active');
    expect(getStatusLabel('Q1')).toBe('Quarter 1');
    expect(getStatusLabel('Q2')).toBe('Quarter 2');
    expect(getStatusLabel('Q3')).toBe('Quarter 3');
    expect(getStatusLabel('Q4')).toBe('Quarter 4');
    expect(getStatusLabel('FINISHED')).toBe('Finished');
    expect(getStatusLabel('DELETED')).toBe('Deleted');
  });

  it('should return "Active" for unknown status', () => {
    expect(getStatusLabel('INVALID' as ContestStatus)).toBe('Active');
  });
});

describe('isInGameStatus', () => {
  it('should be true for quarter statuses', () => {
    expect(isInGameStatus('Q1')).toBe(true);
    expect(isInGameStatus('Q2')).toBe(true);
    expect(isInGameStatus('Q3')).toBe(true);
    expect(isInGameStatus('Q4')).toBe(true);
  });

  it('should be false for non-quarter statuses', () => {
    expect(isInGameStatus('ACTIVE')).toBe(false);
    expect(isInGameStatus('FINISHED')).toBe(false);
    expect(isInGameStatus('DELETED')).toBe(false);
  });

  it('should be false for undefined or null', () => {
    expect(isInGameStatus(undefined)).toBe(false);
    expect(isInGameStatus(null)).toBe(false);
  });
});

describe('isTerminalStatus', () => {
  it('should be true for finished and deleted', () => {
    expect(isTerminalStatus('FINISHED')).toBe(true);
    expect(isTerminalStatus('DELETED')).toBe(true);
  });

  it('should be false for active and in-game statuses', () => {
    expect(isTerminalStatus('ACTIVE')).toBe(false);
    expect(isTerminalStatus('Q1')).toBe(false);
    expect(isTerminalStatus('Q4')).toBe(false);
  });

  it('should be false for undefined or null', () => {
    expect(isTerminalStatus(undefined)).toBe(false);
    expect(isTerminalStatus(null)).toBe(false);
  });
});
