import { createTheme, type Theme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import theme, { primaryTint, secondaryTint } from './theme';

type Override = (arg: unknown) => unknown;

const plain = createTheme({ palette: theme.palette });

// runs every style override the theme defines, whether a slot map or a whole-theme function
function renderOverrides(target: Theme) {
  const results: unknown[] = [];
  for (const component of Object.values(target.components ?? {})) {
    const overrides = (component as { styleOverrides?: unknown }).styleOverrides;
    if (typeof overrides === 'function') {
      results.push((overrides as Override)(target));
    } else if (overrides && typeof overrides === 'object') {
      for (const slot of Object.values(overrides)) {
        if (typeof slot === 'function') {
          results.push((slot as Override)({ theme: target }));
        }
      }
    }
  }
  return results;
}

describe('theme', () => {
  it('tints from the color scheme vars, and from the palette without them', () => {
    expect(primaryTint(theme, 0.2)).toMatch(/^rgba\(.+ \/ 0\.2\)$/);
    expect(secondaryTint(theme, 0.4)).toMatch(/ \/ 0\.4\)$/);
    expect(primaryTint(plain, 0.2)).toMatch(/ \/ 0\.2\)$/);
    expect(secondaryTint(plain, 0.4)).toMatch(/ \/ 0\.4\)$/);
  });

  it('builds every style override with and without color scheme vars', () => {
    const withVars = renderOverrides(theme);
    const withoutVars = renderOverrides({ ...theme, vars: undefined } as unknown as Theme);

    expect(withVars.length).toBeGreaterThan(5);
    expect(withoutVars).toHaveLength(withVars.length);
    withoutVars.forEach((styles) => expect(styles).toBeTruthy());
  });
});
