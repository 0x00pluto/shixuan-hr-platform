CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`actor_id` text,
	`payload_json` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `business_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`business_line_id` text NOT NULL,
	`leader_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`business_line_id`) REFERENCES `business_lines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mock_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`channel` text DEFAULT 'feishu' NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`department_id` text,
	`job_position_id` text,
	`avatar_url` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `archived_recruitment_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`original_request_id` text NOT NULL,
	`candidate_id` text,
	`original_title` text NOT NULL,
	`original_job_position_id` text NOT NULL,
	`new_job_position_id` text,
	`reason` text,
	`archived_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `headcount_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`business_line_id` text NOT NULL,
	`department_id` text,
	`planned_count` integer NOT NULL,
	`actual_count` integer DEFAULT 0 NOT NULL,
	`period` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `job_kpi_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`department_type` text NOT NULL,
	`metrics_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `job_position_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`job_position_id` text NOT NULL,
	`template_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`job_position_id`) REFERENCES `job_positions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`template_id`) REFERENCES `job_kpi_templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `job_positions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`department_id` text NOT NULL,
	`expected_result` text NOT NULL,
	`primary_owner_id` text NOT NULL,
	`collaborator_ids` text,
	`completion_standard` text NOT NULL,
	`checker_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`is_quantifiable` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recruitment_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`job_position_id` text NOT NULL,
	`title` text NOT NULL,
	`is_key_position` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`job_position_id`) REFERENCES `job_positions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `candidate_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`tag` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`resume_summary` text,
	`advantages` text,
	`training_direction` text,
	`stage` text DEFAULT 'screening' NOT NULL,
	`target_job_position_id` text,
	`recruitment_request_id` text,
	`is_key_candidate` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`target_job_position_id`) REFERENCES `job_positions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `hiring_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`decision` text NOT NULL,
	`decided_by_id` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `interview_analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`advantages_json` text,
	`skill_scores_json` text,
	`risks_json` text,
	`reasoning_chain` text,
	`overall_score` real,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `interview_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`question_type` text NOT NULL,
	`content` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `interview_recording_consents` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`session_id` text,
	`consented` integer NOT NULL,
	`consent_note` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `interview_records` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`content` text,
	`recording_url` text,
	`demeanor_note` text,
	`demeanor_score` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `interview_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`interviewer_id` text NOT NULL,
	`scheduled_at` text,
	`completed_at` text,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mbti_assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mbti_results` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`type_code` text NOT NULL,
	`dimensions_json` text,
	`summary` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `routing_suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`route_type` text NOT NULL,
	`suggested_job_position_id` text,
	`opc_project_hint` text,
	`rationale` text NOT NULL,
	`confidence` real,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `daily_report_annotations` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`author_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `daily_report_items` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`item_type` text NOT NULL,
	`title` text NOT NULL,
	`content_json` text NOT NULL,
	`business_line_id` text,
	`department_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `daily_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`report_date` text NOT NULL,
	`summary_json` text NOT NULL,
	`feishu_preview_url` text,
	`generated_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `course_skill_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`skill_tag` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`video_url` text NOT NULL,
	`uploaded_by_id` text NOT NULL,
	`target_audience` text,
	`duration_minutes` integer,
	`bitable_sync_status` text DEFAULT 'mock_synced',
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `training_course_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`course_id` text NOT NULL,
	`is_required` integer DEFAULT true NOT NULL,
	`progress_percent` integer DEFAULT 0 NOT NULL,
	`completed_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `career_path_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`path_type` text NOT NULL,
	`level_name` text NOT NULL,
	`level_order` integer NOT NULL,
	`description` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `performance_capability_standards` (
	`id` text PRIMARY KEY NOT NULL,
	`job_position_id` text NOT NULL,
	`title` text NOT NULL,
	`criteria` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `performance_result_standards` (
	`id` text PRIMARY KEY NOT NULL,
	`job_position_id` text NOT NULL,
	`metric_name` text NOT NULL,
	`target_value` text NOT NULL,
	`unit` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `performance_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`review_type` text NOT NULL,
	`period` text NOT NULL,
	`score` real,
	`conclusion` text,
	`feedback` text,
	`actual_value` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `san_jiang_mingbai` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`job_position_id` text,
	`rules_text` text NOT NULL,
	`direction_text` text NOT NULL,
	`benefit_text` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `task_check_results` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`checker_id` text NOT NULL,
	`passed` integer NOT NULL,
	`feedback` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`assignee_id` text NOT NULL,
	`collaborator_ids` text,
	`checker_id` text NOT NULL,
	`creator_id` text NOT NULL,
	`department_id` text,
	`due_at` text NOT NULL,
	`completion_standard` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`task_date` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `salary_audit_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`salary_profile_id` text NOT NULL,
	`submitted_by_id` text NOT NULL,
	`reviewer_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`review_note` text,
	`created_at` text NOT NULL,
	`reviewed_at` text
);
--> statement-breakpoint
CREATE TABLE `salary_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`base_salary` real NOT NULL,
	`salary_ratio` real DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'training' NOT NULL,
	`structure_json` text,
	`audit_status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `salary_profiles_user_id_unique` ON `salary_profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `salary_status_history` (
	`id` text PRIMARY KEY NOT NULL,
	`salary_profile_id` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`from_ratio` real,
	`to_ratio` real NOT NULL,
	`changed_by_id` text NOT NULL,
	`reason` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `opc_agreements` (
	`id` text PRIMARY KEY NOT NULL,
	`partner_id` text NOT NULL,
	`title` text NOT NULL,
	`file_url` text,
	`signed_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `opc_partners` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`candidate_id` text,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`advantages` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `opc_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`partner_id` text NOT NULL,
	`project_name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `opc_revenue_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`share_percent` real NOT NULL,
	`effective_from` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ceo_training_acceptances` (
	`id` text PRIMARY KEY NOT NULL,
	`training_plan_id` text NOT NULL,
	`user_id` text NOT NULL,
	`accepted` integer NOT NULL,
	`notes` text,
	`decided_by_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exam_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`user_id` text NOT NULL,
	`answers_json` text,
	`score` real,
	`passed` integer,
	`attempted_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exam_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`question_type` text NOT NULL,
	`content` text NOT NULL,
	`options_json` text,
	`correct_answer` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `handover_checklists` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`item_title` text NOT NULL,
	`is_completed` integer DEFAULT false NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE TABLE `promotion_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`nomination_id` text NOT NULL,
	`approver_id` text NOT NULL,
	`approver_role` text NOT NULL,
	`approved` integer NOT NULL,
	`notes` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `promotion_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`nomination_id` text NOT NULL,
	`decided_by_id` text NOT NULL,
	`decision` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `promotion_nominations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`nominated_by_id` text NOT NULL,
	`target_level` text NOT NULL,
	`path_type` text NOT NULL,
	`rationale` text NOT NULL,
	`status` text DEFAULT 'nominated' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recruitment_retrospectives` (
	`id` text PRIMARY KEY NOT NULL,
	`period` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`metrics_json` text,
	`created_by_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resignation_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`approver_id` text NOT NULL,
	`approver_role` text NOT NULL,
	`approved` integer NOT NULL,
	`notes` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resignation_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`reason` text NOT NULL,
	`expected_leave_date` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `training_exams` (
	`id` text PRIMARY KEY NOT NULL,
	`training_plan_id` text NOT NULL,
	`title` text NOT NULL,
	`pass_threshold` real DEFAULT 0.8 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `training_extensions` (
	`id` text PRIMARY KEY NOT NULL,
	`training_plan_id` text NOT NULL,
	`reason` text NOT NULL,
	`extended_days` integer DEFAULT 7 NOT NULL,
	`approved_by_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `training_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`started_at` text NOT NULL,
	`expected_end_at` text,
	`completed_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `training_retrospectives` (
	`id` text PRIMARY KEY NOT NULL,
	`period` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`metrics_json` text,
	`created_by_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `analytics_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot_type` text NOT NULL,
	`period` text NOT NULL,
	`data_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attendance_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`record_date` text NOT NULL,
	`check_in_at` text,
	`check_out_at` text,
	`status` text DEFAULT 'normal' NOT NULL,
	`note` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attendance_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`work_start_time` text NOT NULL,
	`work_end_time` text NOT NULL,
	`late_threshold_minutes` integer DEFAULT 15 NOT NULL,
	`applies_to_roles` text DEFAULT 'employee' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `promotion_condition_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`path_type` text NOT NULL,
	`level_name` text NOT NULL,
	`condition_title` text NOT NULL,
	`condition_description` text NOT NULL,
	`metric_key` text,
	`target_value` text,
	`created_at` text NOT NULL
);
