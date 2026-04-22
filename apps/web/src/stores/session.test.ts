import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('session store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('bootstraps an authenticated session from the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ authenticated: true }), { status: 200 })),
    );

    vi.resetModules();
    const { useSessionStore } = await import('./session');
    const sessionStore = useSessionStore();

    await sessionStore.bootstrap();

    expect(sessionStore.authenticated).toBe(true);
    expect(sessionStore.hydrated).toBe(true);
  });

  it('logs in and out through the API', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    vi.stubGlobal('fetch', fetchMock);

    vi.resetModules();
    const { useSessionStore } = await import('./session');
    const sessionStore = useSessionStore();

    await sessionStore.login('secret');
    expect(sessionStore.authenticated).toBe(true);

    await sessionStore.logout();
    expect(sessionStore.authenticated).toBe(false);
  });
});
