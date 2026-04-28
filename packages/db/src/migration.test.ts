import { describe, expect, it } from 'vitest';
import { initializeDatabase } from './bootstrap';
import { createSqliteDatabase } from './client';
import { createRepositories } from './repositories';

describe('migration test', () => {
  it('has tts columns after migration', () => {
    const client = createSqliteDatabase();
    initializeDatabase(client.sqlite);
    const repos = createRepositories(client);

    const appSettingsCols = client.sqlite.prepare('PRAGMA table_info(app_settings)').all();
    const characterCols = client.sqlite.prepare('PRAGMA table_info(characters)').all();

    expect(appSettingsCols.some((c: any) => c.name === 'tts_server_url')).toBe(true);
    expect(characterCols.some((c: any) => c.name === 'voice_reference_id')).toBe(true);
  });
});
