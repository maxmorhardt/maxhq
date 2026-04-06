import { describe, it, expect } from 'vitest';
import { stripDangerousChars } from './sanitize';

describe('stripDangerousChars', () => {
  it('should remove angle brackets', () => {
    expect(stripDangerousChars('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
  });

  it('should remove curly braces', () => {
    expect(stripDangerousChars('{key: "value"}')).toBe('key: "value"');
  });

  it('should remove square brackets', () => {
    expect(stripDangerousChars('[1, 2, 3]')).toBe('1, 2, 3');
  });

  it('should remove backslashes', () => {
    expect(stripDangerousChars('path\\to\\file')).toBe('pathtofile');
  });

  it('should remove pipe characters', () => {
    expect(stripDangerousChars('cmd | grep foo')).toBe('cmd  grep foo');
  });

  it('should remove backticks', () => {
    expect(stripDangerousChars('`injection`')).toBe('injection');
  });

  it('should remove multiple dangerous characters at once', () => {
    expect(stripDangerousChars('<div>{[`test`]}</div>')).toBe('divtest/div');
  });

  it('should leave safe strings unchanged', () => {
    expect(stripDangerousChars('Hello World 123!')).toBe('Hello World 123!');
  });

  it('should return empty string for all-dangerous input', () => {
    expect(stripDangerousChars('<>{}[]\\|`')).toBe('');
  });

  it('should handle empty string', () => {
    expect(stripDangerousChars('')).toBe('');
  });
});
