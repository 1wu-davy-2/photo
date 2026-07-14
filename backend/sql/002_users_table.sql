-- Lumen Archive / user table upgrade for databases initialized with 001_initial_schema.sql
-- Safe to run repeatedly. Existing users and passwords are not overwritten.

USE `photo`;

CREATE TABLE IF NOT EXISTS `users` (
    `id` varchar(36) NOT NULL,
    `username` varchar(64) NOT NULL,
    `password_hash` varchar(255) NOT NULL,
    `role` varchar(32) NOT NULL DEFAULT 'admin',
    `is_active` tinyint(1) NOT NULL DEFAULT 1,
    `created_at` datetime NOT NULL DEFAULT current_timestamp(),
    `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_users_username` (`username`),
    KEY `ix_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `users` (`id`, `username`, `password_hash`, `role`, `is_active`)
VALUES (
    '00000000-0000-4000-8000-000000000001',
    'admin',
    'pbkdf2_sha256$310000$_pLGfnuC34BVTa640T9gjA==$uLMDImr2Ref8jsIpvZMa2uI2hojmVyOiEArCwVMoOzE=',
    'admin',
    1
);
