-- Lumen Archive / per-user folders and photo ownership upgrade
-- Safe to run repeatedly on MariaDB 11.x.

USE `photo`;

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

ALTER TABLE `photos`
    ADD COLUMN IF NOT EXISTS `owner_id` varchar(36) NULL AFTER `checksum`,
    ADD COLUMN IF NOT EXISTS `folder_id` varchar(36) NULL AFTER `owner_id`,
    ADD KEY IF NOT EXISTS `ix_photos_owner_id` (`owner_id`),
    ADD KEY IF NOT EXISTS `ix_photos_folder_id` (`folder_id`);

INSERT INTO `folders` (`id`, `owner_id`, `name`, `is_default`)
SELECT UUID(), `u`.`id`, '图库', 1
FROM `users` AS `u`
LEFT JOIN `folders` AS `f`
    ON `f`.`owner_id` = `u`.`id` AND `f`.`is_default` = 1
WHERE `f`.`id` IS NULL;

UPDATE `photos` AS `p`
JOIN `users` AS `u` ON `u`.`username` = 'admin'
JOIN `folders` AS `f` ON `f`.`owner_id` = `u`.`id` AND `f`.`is_default` = 1
SET `p`.`owner_id` = COALESCE(`p`.`owner_id`, `u`.`id`),
    `p`.`folder_id` = COALESCE(`p`.`folder_id`, `f`.`id`)
WHERE `p`.`owner_id` IS NULL OR `p`.`folder_id` IS NULL;
