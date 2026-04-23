import type { DatabaseSync } from 'node:sqlite';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS provider_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL,
  base_url TEXT NOT NULL,
  model TEXT NOT NULL,
  api_key_env_var TEXT,
  reasoning_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL DEFAULT '',
  instruct_template_json TEXT NOT NULL DEFAULT '',
  temperature REAL NOT NULL,
  top_p REAL NOT NULL,
  top_k INTEGER NOT NULL,
  min_p REAL NOT NULL DEFAULT 0.05,
  frequency_penalty REAL NOT NULL DEFAULT 0,
  presence_penalty REAL NOT NULL DEFAULT 0,
  repeat_penalty REAL NOT NULL DEFAULT 1,
  seed INTEGER,
  context_length INTEGER NOT NULL DEFAULT 131072,
  max_output_tokens INTEGER NOT NULL,
  stop_strings_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  personality TEXT NOT NULL,
  scenario TEXT NOT NULL,
  first_message TEXT NOT NULL,
  example_dialogue TEXT NOT NULL,
  avatar_asset_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  character_id TEXT,
  preset_id TEXT,
  provider_config_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  reasoning_content TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL,
  token_estimate INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  default_provider_config_id TEXT,
  default_preset_id TEXT,
  persona_avatar_asset_path TEXT,
  persona_description TEXT NOT NULL DEFAULT '',
  persona_name TEXT NOT NULL DEFAULT 'User',
  show_reasoning_by_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  session_token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL
);
`;

const MIGRATIONS: Array<{ column: string; sql: string; table: string }> = [
  { column: 'min_p', sql: 'ALTER TABLE presets ADD COLUMN min_p REAL NOT NULL DEFAULT 0.05', table: 'presets' },
  { column: 'frequency_penalty', sql: 'ALTER TABLE presets ADD COLUMN frequency_penalty REAL NOT NULL DEFAULT 0', table: 'presets' },
  { column: 'presence_penalty', sql: 'ALTER TABLE presets ADD COLUMN presence_penalty REAL NOT NULL DEFAULT 0', table: 'presets' },
  { column: 'repeat_penalty', sql: 'ALTER TABLE presets ADD COLUMN repeat_penalty REAL NOT NULL DEFAULT 1', table: 'presets' },
  { column: 'seed', sql: 'ALTER TABLE presets ADD COLUMN seed INTEGER', table: 'presets' },
  { column: 'context_length', sql: 'ALTER TABLE presets ADD COLUMN context_length INTEGER NOT NULL DEFAULT 131072', table: 'presets' },
  { column: 'system_prompt', sql: 'ALTER TABLE presets ADD COLUMN system_prompt TEXT NOT NULL DEFAULT \'\'', table: 'presets' },
  { column: 'instruct_template_json', sql: 'ALTER TABLE presets ADD COLUMN instruct_template_json TEXT NOT NULL DEFAULT \'\'', table: 'presets' },
  { column: 'persona_avatar_asset_path', sql: 'ALTER TABLE app_settings ADD COLUMN persona_avatar_asset_path TEXT', table: 'app_settings' },
  { column: 'persona_description', sql: 'ALTER TABLE app_settings ADD COLUMN persona_description TEXT NOT NULL DEFAULT \'\'', table: 'app_settings' },
  { column: 'persona_name', sql: 'ALTER TABLE app_settings ADD COLUMN persona_name TEXT NOT NULL DEFAULT \'User\'', table: 'app_settings' },
];

function getColumnNames(sqlite: DatabaseSync, table: string): Set<string> {
  const rows = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return new Set(rows.map((row) => row.name));
}

export function initializeDatabase(sqlite: DatabaseSync): void {
  sqlite.exec(SCHEMA_SQL);

  const existingPresetColumns = getColumnNames(sqlite, 'presets');
  const existingAppSettingsColumns = getColumnNames(sqlite, 'app_settings');

  for (const migration of MIGRATIONS) {
    const existingColumns = migration.table === 'app_settings' ? existingAppSettingsColumns : existingPresetColumns;

    if (!existingColumns.has(migration.column)) {
      sqlite.exec(migration.sql);
    }
  }
}
