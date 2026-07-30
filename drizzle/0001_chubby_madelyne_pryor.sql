CREATE TABLE `enrollment_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`enrollment_id` integer NOT NULL,
	`document_type` text NOT NULL,
	`label` text NOT NULL,
	`status` text DEFAULT 'Pendente' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`updated_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrollment_documents_enrollment_type_unique` ON `enrollment_documents` (`enrollment_id`,`document_type`);--> statement-breakpoint
CREATE INDEX `enrollment_documents_status_idx` ON `enrollment_documents` (`status`);--> statement-breakpoint
CREATE TABLE `enrollment_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`enrollment_id` integer NOT NULL,
	`action` text NOT NULL,
	`description` text NOT NULL,
	`author_email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `enrollment_history_enrollment_created_idx` ON `enrollment_history` (`enrollment_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `enrollment_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`enrollment_id` integer NOT NULL,
	`body` text NOT NULL,
	`author_email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `enrollment_notes_enrollment_created_idx` ON `enrollment_notes` (`enrollment_id`,`created_at`);