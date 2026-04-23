import type { DatabaseSync } from 'node:sqlite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';

import { schema } from './schema';

const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), '../drizzle');

export function initializeDatabase(sqlite: DatabaseSync): void {
  const db = drizzle({ client: sqlite, schema });

  migrate(db, { migrationsFolder });
}
