import { DatabaseSync } from 'node:sqlite';

import { drizzle } from 'drizzle-orm/node-sqlite';

import { schema } from './schema';

export interface SqliteDatabaseClient {
  db: ReturnType<typeof drizzle<typeof schema>>;
  sqlite: DatabaseSync;
}

export function createSqliteDatabase(location = ':memory:'): SqliteDatabaseClient {
  const sqlite = new DatabaseSync(location);
  const db = drizzle({ client: sqlite, schema });

  return {
    db,
    sqlite,
  };
}

export function pingSqlite(sqlite: DatabaseSync): number {
  const row = sqlite.prepare('select 1 as value').get() as { value: number };

  return row.value;
}
