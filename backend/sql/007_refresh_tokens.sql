-- Rotating refresh tokens for persistent browser sessions.
-- Safe to run repeatedly on MariaDB 11.x.

USE `photo`;

CREATE TABLE IF NOT EXISTS `refresh_tokens` (
    `id` varchar(36) NOT NULL,
    `user_id` varchar(36) NOT NULL,
    `token_hash` varchar(64) NOT NULL,
    `created_at` datetime NOT NULL,
    `expires_at` datetime NOT NULL,
    `revoked_at` datetime NULL,
    `replaced_by_id` varchar(36) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_refresh_tokens_token_hash` (`token_hash`),
    KEY `ix_refresh_tokens_user_id` (`user_id`),
    KEY `ix_refresh_tokens_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
