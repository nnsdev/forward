import { describe, expect, it } from 'vitest';

import { createSqliteDatabase, pingSqlite } from './client';

describe('createSqliteDatabase', () => {
  it('creates an in-memory sqlite client that responds to queries', () => {
    const { sqlite } = createSqliteDatabase();

    expect(pingSqlite(sqlite)).toBe(1);
  });
});
