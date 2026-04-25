CREATE TABLE IF NOT EXISTS scenes (
	id text PRIMARY KEY NOT NULL,
	chat_id text NOT NULL,
	title text NOT NULL,
	description text DEFAULT '' NOT NULL,
	sort_order integer DEFAULT 0 NOT NULL,
	is_active integer DEFAULT 0 NOT NULL,
	created_at text NOT NULL,
	updated_at text NOT NULL
);
