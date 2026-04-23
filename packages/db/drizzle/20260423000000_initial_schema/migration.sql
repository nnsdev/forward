CREATE TABLE IF NOT EXISTS provider_configs (
	id text PRIMARY KEY NOT NULL,
	name text NOT NULL,
	provider_type text NOT NULL,
	base_url text NOT NULL,
	model text NOT NULL,
	api_key_env_var text,
	reasoning_enabled integer DEFAULT 0 NOT NULL,
	created_at text NOT NULL,
	updated_at text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS presets (
	id text PRIMARY KEY NOT NULL,
	name text NOT NULL,
	system_prompt text DEFAULT '' NOT NULL,
	instruct_template_json text DEFAULT '' NOT NULL,
	thinking_budget_tokens integer,
	temperature real NOT NULL,
	top_p real NOT NULL,
	top_k integer NOT NULL,
	min_p real DEFAULT 0.05 NOT NULL,
	frequency_penalty real DEFAULT 0 NOT NULL,
	presence_penalty real DEFAULT 0 NOT NULL,
	repeat_penalty real DEFAULT 1 NOT NULL,
	seed integer,
	context_length integer DEFAULT 131072 NOT NULL,
	max_output_tokens integer NOT NULL,
	stop_strings_json text NOT NULL,
	created_at text NOT NULL,
	updated_at text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS characters (
	id text PRIMARY KEY NOT NULL,
	name text NOT NULL,
	description text NOT NULL,
	personality text NOT NULL,
	scenario text NOT NULL,
	first_message text NOT NULL,
	example_dialogue text NOT NULL,
	avatar_asset_path text,
	created_at text NOT NULL,
	updated_at text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS chats (
	id text PRIMARY KEY NOT NULL,
	title text NOT NULL,
	character_id text,
	preset_id text,
	provider_config_id text,
	created_at text NOT NULL,
	updated_at text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS messages (
	id text PRIMARY KEY NOT NULL,
	chat_id text NOT NULL,
	attempt_group_id text,
	attempt_index integer DEFAULT 0 NOT NULL,
	is_active_attempt integer DEFAULT 1 NOT NULL,
	role text NOT NULL,
	content text NOT NULL,
	reasoning_content text DEFAULT '' NOT NULL,
	state text NOT NULL,
	token_estimate integer,
	created_at text NOT NULL,
	updated_at text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS app_settings (
	id text PRIMARY KEY NOT NULL,
	default_provider_config_id text,
	default_preset_id text,
	persona_avatar_asset_path text,
	persona_description text DEFAULT '' NOT NULL,
	persona_name text DEFAULT 'User' NOT NULL,
	show_reasoning_by_default integer DEFAULT 0 NOT NULL,
	created_at text NOT NULL,
	updated_at text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS sessions (
	id text PRIMARY KEY NOT NULL,
	session_token_hash text NOT NULL,
	expires_at text NOT NULL,
	last_seen_at text NOT NULL,
	user_agent text,
	ip_address text,
	created_at text NOT NULL
);
