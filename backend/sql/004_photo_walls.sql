-- Lumen Archive / persistent photo walls and read-only sharing
-- Safe to run repeatedly on MariaDB 11.x.

USE `photo`;

CREATE TABLE IF NOT EXISTS `photo_walls` (
    `id` varchar(36) NOT NULL,
    `owner_id` varchar(36) NOT NULL,
    `name` varchar(120) NOT NULL,
    `background_color` varchar(32) NOT NULL DEFAULT '#F6FAFF',
    `created_at` datetime NOT NULL DEFAULT current_timestamp(),
    `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`id`),
    KEY `ix_photo_walls_owner_id` (`owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `photo_wall_items` (
    `id` varchar(36) NOT NULL,
    `wall_id` varchar(36) NOT NULL,
    `photo_id` varchar(36) NOT NULL,
    `x` double NOT NULL DEFAULT 10,
    `y` double NOT NULL DEFAULT 10,
    `width` double NOT NULL DEFAULT 24,
    `height` double NOT NULL DEFAULT 18,
    `rotation` double NOT NULL DEFAULT 0,
    `z_index` int NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    KEY `ix_photo_wall_items_wall_id` (`wall_id`),
    KEY `ix_photo_wall_items_photo_id` (`photo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `photo_wall_shares` (
    `id` varchar(36) NOT NULL,
    `wall_id` varchar(36) NOT NULL,
    `token` varchar(96) NOT NULL,
    `is_active` tinyint(1) NOT NULL DEFAULT 1,
    `created_at` datetime NOT NULL DEFAULT current_timestamp(),
    `expires_at` datetime NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_photo_wall_shares_token` (`token`),
    KEY `ix_photo_wall_shares_wall_id` (`wall_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
