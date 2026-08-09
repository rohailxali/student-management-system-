CREATE TABLE `academic_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`subject` varchar(120) NOT NULL,
	`grade` varchar(20),
	`marks` int,
	`maxMarks` int DEFAULT 100,
	`term` varchar(40),
	`recordedAt` date NOT NULL,
	`createdAt` int NOT NULL,
	CONSTRAINT `academic_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`action` enum('created','updated','deleted','record_added','record_updated','record_removed') NOT NULL,
	`detail` text,
	`actor` varchar(200),
	`createdAt` int NOT NULL,
	CONSTRAINT `activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`studentId` varchar(40) NOT NULL,
	`email` varchar(320),
	`phone` varchar(40),
	`dateOfBirth` date,
	`grade` varchar(40) NOT NULL,
	`enrollmentDate` date NOT NULL,
	`status` enum('active','inactive','graduated','withdrawn') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` int NOT NULL,
	`updatedAt` int NOT NULL,
	CONSTRAINT `students_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_id_idx` UNIQUE(`studentId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `createdAt` int NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `updatedAt` int NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` int NOT NULL;