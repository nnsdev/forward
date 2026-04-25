CREATE TABLE IF NOT EXISTS character_states (
	id text PRIMARY KEY NOT NULL,
	character_id text NOT NULL,
	key text NOT NULL,
	value text DEFAULT '' NOT NULL,
	created_at text NOT NULL,
	updated_at text NOT NULL
);
