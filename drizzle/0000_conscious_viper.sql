CREATE TABLE `enrollments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`protocol` text NOT NULL,
	`name` text NOT NULL,
	`cpf` text NOT NULL,
	`birth_date` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`city` text NOT NULL,
	`course` text NOT NULL,
	`shift` text NOT NULL,
	`experience` text DEFAULT 'Iniciante' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'Nova' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrollments_protocol_unique` ON `enrollments` (`protocol`);--> statement-breakpoint
CREATE INDEX `enrollments_created_at_idx` ON `enrollments` (`created_at`);--> statement-breakpoint
CREATE INDEX `enrollments_status_idx` ON `enrollments` (`status`);