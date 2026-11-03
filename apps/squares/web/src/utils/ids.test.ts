import { describe, expect, it } from 'vitest';
import { isUuid } from './ids';

describe('isUuid', () => {
  it('accepts a uuid in either case', () => {
    expect(isUuid('0b5f7f8e-6f3c-4a43-9d8d-1d1c7f1f0002')).toBe(true);
    expect(isUuid('0B5F7F8E-6F3C-4A43-9D8D-1D1C7F1F0002')).toBe(true);
  });

  it.each(['', 'g-1', '../../accounts/users/me', '0b5f7f8e-6f3c-4a43-9d8d-1d1c7f1f0002/x'])(
    'turns away %j',
    (value) => {
      expect(isUuid(value)).toBe(false);
    }
  );
});
