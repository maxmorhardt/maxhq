import { describe, expect, it } from 'vitest';
import { getUserManager } from './userManager';

describe('getUserManager', () => {
  it('creates one manager for the app, pointed at the squares client', () => {
    const manager = getUserManager();
    expect(getUserManager()).toBe(manager);
    expect(manager.settings.client_id).toMatch(/^squares/);
    expect(manager.settings.redirect_uri).toBe(`${window.location.origin}/auth/callback`);
  });
});
