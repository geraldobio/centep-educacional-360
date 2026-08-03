CREATE TABLE `students` (
  `id` text PRIMARY KEY NOT NULL,
  `source_enrollment_id` integer NOT NULL,
  `registration_number` text NOT NULL,
  `created_by` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`source_enrollment_id`) REFERENCES `enrollments`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `students_source_enrollment_unique` ON `students` (`source_enrollment_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `students_registration_number_unique` ON `students` (`registration_number`);
--> statement-breakpoint
CREATE TABLE `academic_enrollments` (
  `id` text PRIMARY KEY NOT NULL,
  `student_id` text NOT NULL,
  `course` text NOT NULL,
  `class_name` text NOT NULL,
  `shift` text NOT NULL,
  `status` text DEFAULT 'Ativa' NOT NULL,
  `enrolled_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `created_by` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `academic_enrollments_student_course_class_unique` ON `academic_enrollments` (`student_id`,`course`,`class_name`);
--> statement-breakpoint
CREATE INDEX `academic_enrollments_status_idx` ON `academic_enrollments` (`status`);
--> statement-breakpoint
CREATE INDEX `academic_enrollments_course_class_idx` ON `academic_enrollments` (`course`,`class_name`);
