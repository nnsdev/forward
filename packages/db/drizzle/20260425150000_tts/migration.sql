ALTER TABLE `characters` ADD COLUMN `voice_reference_id` text;
--> statement-breakpoint
ALTER TABLE `app_settings` ADD COLUMN `tts_server_url` text;