CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `collections_owner` ON `collections` (`userId`);--> statement-breakpoint
CREATE TABLE `drawings` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`collectionId` text,
	`version` integer DEFAULT 1 NOT NULL,
	`sceneKey` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `drawings_owner` ON `drawings` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`drawingId` text NOT NULL,
	`sessionId` text NOT NULL,
	`event` text NOT NULL,
	`payload` text NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_drawing` ON `events` (`drawingId`,`id`);--> statement-breakpoint
CREATE TABLE `files` (
	`drawingId` text NOT NULL,
	`fileId` text NOT NULL,
	`objectKey` text NOT NULL,
	`mimeType` text NOT NULL,
	`size` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `drawing_file` ON `files` (`drawingId`,`fileId`);--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`drawingId` text NOT NULL,
	`version` integer NOT NULL,
	`sceneKey` text NOT NULL,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `snapshot_version` ON `snapshots` (`drawingId`,`version`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`preferences` text DEFAULT '{}' NOT NULL,
	`library` text DEFAULT '[]' NOT NULL
);
