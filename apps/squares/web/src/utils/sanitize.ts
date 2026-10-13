const DANGEROUS_CHARS = /[<>{}[\]\\|`]/g;

export function stripDangerousChars(value: string): string {
  return value.replace(DANGEROUS_CHARS, '');
}
