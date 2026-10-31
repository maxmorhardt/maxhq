import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initFaro } from './faro';

const initializeFaro = vi.hoisted(() => vi.fn());
vi.mock('@grafana/faro-web-sdk', () => ({
  initializeFaro,
  getWebInstrumentations: () => [],
}));

const URL = 'https://collector.example/collect/key';

describe('initFaro', () => {
  beforeEach(() => {
    initializeFaro.mockClear();
  });

  it('stays off without a collector url', async () => {
    await initFaro('maxhq.io', '');
    expect(initializeFaro).not.toHaveBeenCalled();
  });

  it('stays off on localhost', async () => {
    await initFaro('localhost', URL);
    expect(initializeFaro).not.toHaveBeenCalled();
  });

  it.each([
    ['maxhq.io', 'production'],
    ['dev.maxhq.io', 'development'],
  ])('tags %s as %s', async (hostname, environment) => {
    await initFaro(hostname, URL);
    expect(initializeFaro).toHaveBeenCalledWith(
      expect.objectContaining({ url: URL, app: { name: 'maxhq', environment } })
    );
  });
});
