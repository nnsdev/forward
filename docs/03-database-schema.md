# Database Schema

## Summary

SQLite is the source of truth for all persistent application data except media binaries and env secrets.

## Schema Principles

1. Store canonical app state in normalized tables.
2. Store provider secrets in env, not SQLite.
3. Store media on disk and reference it by path or asset id.
4. Keep room for migrations from the beginning.
5. Persist reasoning separately from visible assistant content.

## Tables

### `sessions`

Purpose:

- Server-side session storage for the single authenticated user

Suggested fields:

- `id`
- `session_token_hash`
- `created_at`
- `expires_at`
- `last_seen_at`
- `user_agent`
- `ip_address`

### `app_settings`

Purpose:

- Global single-user application settings

Suggested fields:

- `id`
- `default_provider_config_id`
- `default_preset_id`
- `ui_theme`
- `show_reasoning_by_default`
- `created_at`
- `updated_at`

### `provider_configs`

Purpose:

- Non-secret provider connection definitions

Suggested fields:

- `id`
- `name`
- `provider_type`
- `base_url`
- `model`
- `api_key_env_var`
- `options_json`
- `created_at`
- `updated_at`

Notes:

- `api_key_env_var` points to an env variable name, not the secret value
- Providers without secrets can leave `api_key_env_var` empty

### `presets`

Purpose:

- Reusable generation parameter sets

Suggested fields:

- `id`
- `name`
- `temperature`
- `top_p`
- `top_k`
- `min_p`
- `max_output_tokens`
- `repeat_penalty`
- `presence_penalty`
- `frequency_penalty`
- `stop_strings_json`
- `formatting_mode`
- `created_at`
- `updated_at`

### `characters`

Purpose:

- Character definitions used to build prompts and label chats

Suggested fields:

- `id`
- `name`
- `description`
- `personality`
- `scenario`
- `first_message`
- `example_dialogue`
- `avatar_asset_path`
- `metadata_json`
- `created_at`
- `updated_at`

### `chats`

Purpose:

- Top-level conversation metadata

Suggested fields:

- `id`
- `title`
- `character_id`
- `preset_id`
- `provider_config_id`
- `created_at`
- `updated_at`

### `messages`

Purpose:

- Individual chat messages, including streamed assistant output

Suggested fields:

- `id`
- `chat_id`
- `role`
- `content`
- `reasoning_content`
- `state`
- `provider_message_id`
- `token_estimate`
- `meta_json`
- `created_at`
- `updated_at`

Recommended `state` values:

- `pending`
- `streaming`
- `completed`
- `cancelled`
- `failed`

### `imports`

Purpose:

- Track import operations and source metadata

Suggested fields:

- `id`
- `import_type`
- `source_name`
- `source_format`
- `result_entity_type`
- `result_entity_id`
- `status`
- `details_json`
- `created_at`

## Relationships

- `chats.character_id -> characters.id`
- `chats.preset_id -> presets.id`
- `chats.provider_config_id -> provider_configs.id`
- `messages.chat_id -> chats.id`
- `app_settings.default_provider_config_id -> provider_configs.id`
- `app_settings.default_preset_id -> presets.id`

## Media Storage

Media files should live in an app-managed data directory, for example:

```text
data/
  media/
    avatars/
    imports/
```

Only file paths or asset references are stored in SQLite.

## Migration Strategy

- Use Drizzle migrations from the first commit
- Never rely on ad hoc schema creation in app startup
- Add reversible migrations where practical
- Treat schema updates as explicit reviewed changes

## Export Rules

- Export user-visible chat content
- Exclude reasoning by default
- Export enough metadata to rehydrate app-native entities later
