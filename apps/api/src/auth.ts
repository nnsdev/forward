import type { Context, MiddlewareHandler } from 'hono';
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie';

import type { AppConfig } from './config';

export const SESSION_COOKIE_NAME = 'forward_session';
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function isAuthenticated(c: Context, config: AppConfig): Promise<boolean> {
  const cookieValue = await getSignedCookie(c, config.sessionSecret, SESSION_COOKIE_NAME);

  return cookieValue === 'authenticated';
}

export async function issueSessionCookie(c: Context, config: AppConfig): Promise<void> {
  await setSignedCookie(c, SESSION_COOKIE_NAME, 'authenticated', config.sessionSecret, {
    httpOnly: true,
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'Lax',
  });
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: '/',
  });
}

export function requireAuth(config: AppConfig): MiddlewareHandler {
  return async (c, next) => {
    if (!(await isAuthenticated(c, config))) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    await next();
  };
}
