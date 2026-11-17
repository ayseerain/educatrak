-- EducaTrak existing migration schema: descriptive draft only.
-- Source: backend/database/migrations/*.php on feature/backend-foundation
-- at 124a78637e36ee91fd0b3a126813b5a394305ab6.
-- NOT approved future design; NOT validated against target MySQL; DO NOT RUN.
-- Ordered CREATE TABLE statements reflect migration definitions. Laravel migrations
-- remain executable source of truth. This file contains no fixture or school data.
-- Engine/config evidence: backend/config/database.php (InnoDB, utf8mb4).

CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NULL,
  `role` VARCHAR(255) NOT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_protected` TINYINT(1) NOT NULL DEFAULT 0,
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 1,
  `last_login_at` TIMESTAMP NULL,
  `password` VARCHAR(255) NOT NULL,
  `remember_token` VARCHAR(100) NULL,
  `archived_at` TIMESTAMP NULL,
  `archived_by` BIGINT UNSIGNED NULL,
  `anonymize_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`), UNIQUE KEY `users_username_unique` (`username`),
  UNIQUE KEY `users_email_unique` (`email`), KEY `users_role_index` (`role`),
  KEY `users_active_index` (`active`), KEY `users_archived_at_index` (`archived_at`),
  KEY `users_anonymize_at_index` (`anonymize_at`),
  CONSTRAINT `users_archived_by_foreign` FOREIGN KEY (`archived_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `password_reset_tokens` (
  `username` VARCHAR(255) NOT NULL, `token` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NULL, PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sessions` (
  `id` VARCHAR(255) NOT NULL, `user_id` BIGINT UNSIGNED NULL,
  `ip_address` VARCHAR(45) NULL, `user_agent` TEXT NULL,
  `payload` LONGTEXT NOT NULL, `last_activity` INT NOT NULL,
  PRIMARY KEY (`id`), KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cache` (
  `key` VARCHAR(255) NOT NULL, `value` MEDIUMTEXT NOT NULL,
  `expiration` BIGINT NOT NULL, PRIMARY KEY (`key`), KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cache_locks` (
  `key` VARCHAR(255) NOT NULL, `owner` VARCHAR(255) NOT NULL,
  `expiration` BIGINT NOT NULL, PRIMARY KEY (`key`), KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `jobs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `queue` VARCHAR(255) NOT NULL,
  `payload` LONGTEXT NOT NULL, `attempts` SMALLINT UNSIGNED NOT NULL,
  `reserved_at` INT UNSIGNED NULL, `available_at` INT UNSIGNED NOT NULL,
  `created_at` INT UNSIGNED NOT NULL, PRIMARY KEY (`id`), KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `job_batches` (
  `id` VARCHAR(255) NOT NULL, `name` VARCHAR(255) NOT NULL,
  `total_jobs` INT NOT NULL, `pending_jobs` INT NOT NULL, `failed_jobs` INT NOT NULL,
  `failed_job_ids` LONGTEXT NOT NULL, `options` MEDIUMTEXT NULL,
  `cancelled_at` INT NULL, `created_at` INT NOT NULL, `finished_at` INT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `failed_jobs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `uuid` VARCHAR(255) NOT NULL,
  `connection` VARCHAR(255) NOT NULL, `queue` VARCHAR(255) NOT NULL,
  `payload` LONGTEXT NOT NULL, `exception` LONGTEXT NOT NULL,
  `failed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`),
  KEY `failed_jobs_connection_queue_failed_at_index` (`connection`,`queue`,`failed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `school_years` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `label` VARCHAR(255) NOT NULL,
  `is_current` TINYINT(1) NOT NULL DEFAULT 0, `starts_on` DATE NOT NULL, `ends_on` DATE NOT NULL,
  `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, PRIMARY KEY (`id`),
  UNIQUE KEY `school_years_label_unique` (`label`), KEY `school_years_is_current_index` (`is_current`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `terms` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `school_year_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL, `sequence` SMALLINT UNSIGNED NOT NULL,
  `starts_on` DATE NULL, `ends_on` DATE NULL, `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`), UNIQUE KEY `terms_school_year_id_sequence_unique` (`school_year_id`,`sequence`),
  CONSTRAINT `terms_school_year_id_foreign` FOREIGN KEY (`school_year_id`) REFERENCES `school_years` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `exam_periods` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `term_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL, `starts_on` DATE NOT NULL, `ends_on` DATE NULL,
  `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, PRIMARY KEY (`id`),
  CONSTRAINT `exam_periods_term_id_foreign` FOREIGN KEY (`term_id`) REFERENCES `terms` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `grade_levels` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `name` VARCHAR(255) NOT NULL,
  `sort_order` SMALLINT UNSIGNED NOT NULL, `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, PRIMARY KEY (`id`),
  UNIQUE KEY `grade_levels_name_unique` (`name`), UNIQUE KEY `grade_levels_sort_order_unique` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sections` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `grade_level_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL, `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, PRIMARY KEY (`id`),
  UNIQUE KEY `sections_grade_level_id_name_unique` (`grade_level_id`,`name`),
  CONSTRAINT `sections_grade_level_id_foreign` FOREIGN KEY (`grade_level_id`) REFERENCES `grade_levels` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `guardians` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `full_name` VARCHAR(255) NOT NULL,
  `relationship` VARCHAR(255) NOT NULL, `email` VARCHAR(255) NULL,
  `email_status` VARCHAR(255) NOT NULL DEFAULT 'missing', `mobile` VARCHAR(32) NULL,
  `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, PRIMARY KEY (`id`),
  KEY `guardians_email_index` (`email`), KEY `guardians_email_status_index` (`email_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `students` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `lrn` VARCHAR(12) NOT NULL,
  `full_name` VARCHAR(255) NOT NULL, `grade_level_id` BIGINT UNSIGNED NULL,
  `section_id` BIGINT UNSIGNED NULL, `status` VARCHAR(255) NOT NULL DEFAULT 'enrolled',
  `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, PRIMARY KEY (`id`),
  UNIQUE KEY `students_lrn_unique` (`lrn`), KEY `students_status_index` (`status`),
  CONSTRAINT `students_grade_level_id_foreign` FOREIGN KEY (`grade_level_id`) REFERENCES `grade_levels` (`id`) ON DELETE SET NULL,
  CONSTRAINT `students_section_id_foreign` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `guardian_student` (
  `guardian_id` BIGINT UNSIGNED NOT NULL, `student_id` BIGINT UNSIGNED NOT NULL,
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0, `relationship` VARCHAR(100) NULL,
  `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`guardian_id`,`student_id`),
  CONSTRAINT `guardian_student_guardian_id_foreign` FOREIGN KEY (`guardian_id`) REFERENCES `guardians` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `guardian_student_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `fee_schedules` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `school_year_id` BIGINT UNSIGNED NOT NULL,
  `grade_level_id` BIGINT UNSIGNED NOT NULL, `name` VARCHAR(255) NOT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1, `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`), UNIQUE KEY `fee_schedules_year_grade_name_unique` (`school_year_id`,`grade_level_id`,`name`),
  CONSTRAINT `fee_schedules_school_year_id_foreign` FOREIGN KEY (`school_year_id`) REFERENCES `school_years` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fee_schedules_grade_level_id_foreign` FOREIGN KEY (`grade_level_id`) REFERENCES `grade_levels` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `fee_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `fee_schedule_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL, `category` VARCHAR(255) NOT NULL,
  `amount_cents` BIGINT UNSIGNED NOT NULL, `required` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` SMALLINT UNSIGNED NOT NULL DEFAULT 0, `active` TINYINT(1) NOT NULL DEFAULT 1,
  `version` INT UNSIGNED NOT NULL DEFAULT 1, `previous_version_id` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, PRIMARY KEY (`id`),
  CONSTRAINT `fee_items_fee_schedule_id_foreign` FOREIGN KEY (`fee_schedule_id`) REFERENCES `fee_schedules` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fee_items_previous_version_id_foreign` FOREIGN KEY (`previous_version_id`) REFERENCES `fee_items` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payment_plans` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `name` VARCHAR(255) NOT NULL,
  `down_payment_type` VARCHAR(255) NOT NULL, `down_payment_value` INT UNSIGNED NOT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1, `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`), UNIQUE KEY `payment_plans_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payment_plan_installments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `payment_plan_id` BIGINT UNSIGNED NOT NULL,
  `label` VARCHAR(255) NOT NULL, `sequence` SMALLINT UNSIGNED NOT NULL,
  `due_day_offset` SMALLINT UNSIGNED NOT NULL,
  `percent_of_remaining_basis_points` SMALLINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, PRIMARY KEY (`id`),
  UNIQUE KEY `plan_installments_plan_sequence_unique` (`payment_plan_id`,`sequence`),
  CONSTRAINT `payment_plan_installments_payment_plan_id_foreign` FOREIGN KEY (`payment_plan_id`) REFERENCES `payment_plans` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `system_settings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `key` VARCHAR(255) NOT NULL,
  `value` JSON NOT NULL, `updated_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, PRIMARY KEY (`id`),
  UNIQUE KEY `system_settings_key_unique` (`key`),
  CONSTRAINT `system_settings_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `billing_accounts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `student_id` BIGINT UNSIGNED NOT NULL,
  `school_year_id` BIGINT UNSIGNED NOT NULL, `fee_schedule_id` BIGINT UNSIGNED NULL,
  `payment_plan_id` BIGINT UNSIGNED NULL, `status` VARCHAR(255) NOT NULL DEFAULT 'current',
  `total_due_cents` BIGINT UNSIGNED NOT NULL DEFAULT 0, `total_paid_cents` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `balance_cents` BIGINT UNSIGNED NOT NULL DEFAULT 0, `created_by` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, PRIMARY KEY (`id`),
  UNIQUE KEY `billing_accounts_student_year_unique` (`student_id`,`school_year_id`),
  KEY `billing_accounts_status_index` (`status`), KEY `billing_accounts_balance_index` (`balance_cents`),
  CONSTRAINT `billing_accounts_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `billing_accounts_school_year_id_foreign` FOREIGN KEY (`school_year_id`) REFERENCES `school_years` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `billing_accounts_fee_schedule_id_foreign` FOREIGN KEY (`fee_schedule_id`) REFERENCES `fee_schedules` (`id`) ON DELETE SET NULL,
  CONSTRAINT `billing_accounts_payment_plan_id_foreign` FOREIGN KEY (`payment_plan_id`) REFERENCES `payment_plans` (`id`) ON DELETE SET NULL,
  CONSTRAINT `billing_accounts_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `billing_account_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `billing_account_id` BIGINT UNSIGNED NOT NULL,
  `fee_item_id` BIGINT UNSIGNED NULL, `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(255) NOT NULL, `amount_cents` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, PRIMARY KEY (`id`),
  CONSTRAINT `billing_account_items_account_id_foreign` FOREIGN KEY (`billing_account_id`) REFERENCES `billing_accounts` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `billing_account_items_fee_item_id_foreign` FOREIGN KEY (`fee_item_id`) REFERENCES `fee_items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `adjustments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `billing_account_id` BIGINT UNSIGNED NOT NULL,
  `type` VARCHAR(255) NOT NULL, `amount_cents` BIGINT NOT NULL, `reason` VARCHAR(255) NOT NULL,
  `created_by` BIGINT UNSIGNED NOT NULL, `effective_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, PRIMARY KEY (`id`),
  KEY `adjustments_account_effective_index` (`billing_account_id`,`effective_at`),
  CONSTRAINT `adjustments_billing_account_id_foreign` FOREIGN KEY (`billing_account_id`) REFERENCES `billing_accounts` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `adjustments_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `installments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `billing_account_id` BIGINT UNSIGNED NOT NULL,
  `label` VARCHAR(255) NOT NULL, `sequence` SMALLINT UNSIGNED NOT NULL, `due_date` DATE NOT NULL,
  `amount_cents` BIGINT UNSIGNED NOT NULL, `paid_cents` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `status` VARCHAR(255) NOT NULL DEFAULT 'current', `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL, PRIMARY KEY (`id`), KEY `installments_status_index` (`status`),
  UNIQUE KEY `installments_account_sequence_unique` (`billing_account_id`,`sequence`),
  CONSTRAINT `installments_billing_account_id_foreign` FOREIGN KEY (`billing_account_id`) REFERENCES `billing_accounts` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `billing_account_id` BIGINT UNSIGNED NOT NULL,
  `student_id` BIGINT UNSIGNED NOT NULL, `amount_cents` BIGINT UNSIGNED NOT NULL,
  `balance_after_cents` BIGINT UNSIGNED NULL, `method` VARCHAR(255) NOT NULL DEFAULT 'cash',
  `paid_on` DATE NOT NULL, `backdate_reason` VARCHAR(255) NULL,
  `duplicate_override_reason` VARCHAR(255) NULL, `notes` VARCHAR(255) NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT 'valid', `recorded_by` BIGINT UNSIGNED NOT NULL,
  `recorded_at` TIMESTAMP NOT NULL, `reprint_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, PRIMARY KEY (`id`),
  KEY `payments_student_amount_recorded_index` (`student_id`,`amount_cents`,`recorded_at`),
  KEY `payments_account_status_index` (`billing_account_id`,`status`),
  CONSTRAINT `payments_billing_account_id_foreign` FOREIGN KEY (`billing_account_id`) REFERENCES `billing_accounts` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `payments_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `payments_recorded_by_foreign` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `receipts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `payment_id` BIGINT UNSIGNED NOT NULL,
  `sequence` INT UNSIGNED NOT NULL, `receipt_no` VARCHAR(255) NOT NULL,
  `receipt_year` SMALLINT UNSIGNED NOT NULL, `issued_at` TIMESTAMP NOT NULL,
  `first_printed_at` TIMESTAMP NULL, `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`), UNIQUE KEY `receipts_payment_id_unique` (`payment_id`),
  UNIQUE KEY `receipts_sequence_unique` (`sequence`), UNIQUE KEY `receipts_receipt_no_unique` (`receipt_no`),
  CONSTRAINT `receipts_payment_id_foreign` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payment_allocations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `payment_id` BIGINT UNSIGNED NOT NULL,
  `installment_id` BIGINT UNSIGNED NOT NULL, `amount_cents` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, PRIMARY KEY (`id`),
  UNIQUE KEY `payment_allocations_payment_installment_unique` (`payment_id`,`installment_id`),
  CONSTRAINT `payment_allocations_payment_id_foreign` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `payment_allocations_installment_id_foreign` FOREIGN KEY (`installment_id`) REFERENCES `installments` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `void_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `payment_id` BIGINT UNSIGNED NOT NULL,
  `reason` VARCHAR(255) NOT NULL, `requested_by` BIGINT UNSIGNED NOT NULL,
  `requested_at` TIMESTAMP NOT NULL, `status` VARCHAR(255) NOT NULL DEFAULT 'pending',
  `decided_by` BIGINT UNSIGNED NULL, `decided_at` TIMESTAMP NULL,
  `decision_note` VARCHAR(255) NULL, `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`), UNIQUE KEY `void_requests_payment_id_unique` (`payment_id`),
  KEY `void_requests_status_index` (`status`),
  CONSTRAINT `void_requests_payment_id_foreign` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `void_requests_requested_by_foreign` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `void_requests_decided_by_foreign` FOREIGN KEY (`decided_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `clearance_rules` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `kind` VARCHAR(255) NOT NULL,
  `exam_period_id` BIGINT UNSIGNED NULL, `rule` JSON NOT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1, `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `clearance_rules_exam_period_id_foreign` FOREIGN KEY (`exam_period_id`) REFERENCES `exam_periods` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `clearance_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `student_id` BIGINT UNSIGNED NOT NULL,
  `school_year_id` BIGINT UNSIGNED NOT NULL, `exam_period_id` BIGINT UNSIGNED NULL,
  `kind` VARCHAR(255) NOT NULL, `cleared` TINYINT(1) NOT NULL DEFAULT 0,
  `reason` VARCHAR(255) NOT NULL, `calculated_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, PRIMARY KEY (`id`),
  KEY `clearance_records_cleared_index` (`cleared`),
  UNIQUE KEY `clearance_records_student_year_kind_period_unique` (`student_id`,`school_year_id`,`kind`,`exam_period_id`),
  CONSTRAINT `clearance_records_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `clearance_records_school_year_id_foreign` FOREIGN KEY (`school_year_id`) REFERENCES `school_years` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `clearance_records_exam_period_id_foreign` FOREIGN KEY (`exam_period_id`) REFERENCES `exam_periods` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `student_id` BIGINT UNSIGNED NOT NULL,
  `payment_id` BIGINT UNSIGNED NULL, `installment_id` BIGINT UNSIGNED NULL,
  `guardian_email` VARCHAR(255) NULL, `guardian_mobile` VARCHAR(32) NULL,
  `channel` VARCHAR(255) NOT NULL DEFAULT 'email', `load_fee_cents` INT UNSIGNED NULL,
  `kind` VARCHAR(255) NOT NULL, `status` VARCHAR(255) NOT NULL DEFAULT 'queued',
  `failure_reason` VARCHAR(255) NULL, `attempts` INT UNSIGNED NOT NULL DEFAULT 0,
  `delivery_key` VARCHAR(64) NULL, `provider_message_sid` VARCHAR(255) NULL,
  `sent_at` TIMESTAMP NULL, `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`), KEY `notification_logs_status_index` (`status`),
  KEY `notification_logs_student_created_index` (`student_id`,`created_at`),
  KEY `notification_logs_channel_index` (`channel`),
  UNIQUE KEY `notification_logs_delivery_key_unique` (`delivery_key`),
  KEY `notification_logs_provider_message_sid_index` (`provider_message_sid`),
  CONSTRAINT `notification_logs_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `notification_logs_payment_id_foreign` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `notification_logs_installment_id_foreign` FOREIGN KEY (`installment_id`) REFERENCES `installments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `close_outs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `business_date` DATE NOT NULL,
  `cashier_id` BIGINT UNSIGNED NOT NULL, `system_totals` JSON NOT NULL,
  `counted_cash_cents` BIGINT UNSIGNED NOT NULL, `variance_cents` BIGINT NOT NULL,
  `variance_reason` VARCHAR(255) NULL, `submitted_at` TIMESTAMP NOT NULL,
  `signed_off_by` BIGINT UNSIGNED NULL, `signed_off_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, PRIMARY KEY (`id`),
  UNIQUE KEY `close_outs_business_date_cashier_unique` (`business_date`,`cashier_id`),
  CONSTRAINT `close_outs_cashier_id_foreign` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `close_outs_signed_off_by_foreign` FOREIGN KEY (`signed_off_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audit_entries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `user_id` BIGINT UNSIGNED NULL,
  `action` VARCHAR(255) NOT NULL, `entity_type` VARCHAR(255) NOT NULL,
  `entity_id` VARCHAR(255) NOT NULL, `before` JSON NULL, `after` JSON NULL,
  `ip_address` VARCHAR(45) NULL, `user_agent` VARCHAR(1024) NULL,
  `occurred_at` TIMESTAMP NOT NULL, `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`), KEY `audit_entries_occurred_at_index` (`occurred_at`),
  KEY `audit_entries_entity_index` (`entity_type`,`entity_id`),
  CONSTRAINT `audit_entries_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `backup_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `result` VARCHAR(255) NOT NULL,
  `size_bytes` BIGINT UNSIGNED NULL, `error` VARCHAR(255) NULL,
  `completed_at` TIMESTAMP NOT NULL, `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`), KEY `backup_records_result_index` (`result`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `import_batches` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `created_by` BIGINT UNSIGNED NOT NULL,
  `filename` VARCHAR(255) NOT NULL, `status` VARCHAR(255) NOT NULL DEFAULT 'previewed',
  `summary` JSON NOT NULL, `rows` JSON NOT NULL, `committed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, PRIMARY KEY (`id`),
  KEY `import_batches_status_index` (`status`),
  CONSTRAINT `import_batches_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payment_idempotency_keys` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `user_id` BIGINT UNSIGNED NOT NULL,
  `key` VARCHAR(100) NOT NULL, `request_hash` CHAR(64) NOT NULL,
  `response_body` JSON NULL, `response_status` SMALLINT UNSIGNED NULL,
  `completed_at` TIMESTAMP NULL, `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`), UNIQUE KEY `payment_idempotency_user_key_unique` (`user_id`,`key`),
  CONSTRAINT `payment_idempotency_keys_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `receipt_sequences` (
  `id` TINYINT UNSIGNED NOT NULL, `last_sequence` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The migration seeds receipt_sequences.id=1 with MAX(receipts.sequence).
-- This baseline omits that data-dependent INSERT. No application records included.
-- guardian_student.relationship was added by the final migration and backfilled
-- from guardians.relationship. Its down() method intentionally retains the
-- column to avoid destroying values that later diverge per student link.
-- Application compatibility: StudentController writes a new guardian's validated
-- link relationship to both the required legacy column and the pivot. Later
-- link updates do not overwrite the guardian-wide legacy value.
-- Application behavior: fee synchronization uses the existing installment/account
-- status fields and recalculates them in the enclosing finance transaction.
-- No CHECK constraints are added beyond migration declarations. Do not run this
-- descriptive file against any database; migrations remain the source of truth.
