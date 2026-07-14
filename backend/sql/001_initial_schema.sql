-- Lumen Archive / MariaDB 11.x
-- Target database: photo, charset: utf8mb4

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

CREATE TABLE IF NOT EXISTS `folders` (
    `id` varchar(36) NOT NULL,
    `owner_id` varchar(36) NOT NULL,
    `parent_id` varchar(36) NULL,
    `name` varchar(120) NOT NULL,
    `is_default` tinyint(1) NOT NULL DEFAULT 0,
    `created_at` datetime NOT NULL DEFAULT current_timestamp(),
    `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_folders_owner_parent_name` (`owner_id`, `parent_id`, `name`),
    KEY `ix_folders_owner_id` (`owner_id`),
    KEY `ix_folders_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `folders` (`id`, `owner_id`, `name`, `is_default`)
VALUES ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '图库', 1);

CREATE TABLE IF NOT EXISTS `photos` (
    `id` varchar(36) NOT NULL,
    `object_key` varchar(255) NOT NULL,
    `original_name` varchar(255) NOT NULL,
    `mime_type` varchar(100) NOT NULL,
    `size_bytes` int NOT NULL,
    `width` int NOT NULL,
    `height` int NOT NULL,
    `checksum` varchar(64) NOT NULL,
    `owner_id` varchar(36) NULL,
    `folder_id` varchar(36) NULL,
    `created_at` datetime NOT NULL DEFAULT current_timestamp(),
    `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_photos_object_key` (`object_key`),
    KEY `ix_photos_created_at` (`created_at`),
    KEY `ix_photos_original_name` (`original_name`),
    KEY `ix_photos_checksum` (`checksum`),
    KEY `ix_photos_owner_id` (`owner_id`),
    KEY `ix_photos_folder_id` (`folder_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
