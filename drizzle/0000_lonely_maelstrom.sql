CREATE TABLE `checkins` (
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL,
	`minutes` integer DEFAULT 0 NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`user_id`, `date`)
);
