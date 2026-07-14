-- Add independent photo height support to existing photo walls.
-- Safe to run repeatedly on MariaDB 11.x.

USE `photo`;

ALTER TABLE `photo_wall_items`
    ADD COLUMN IF NOT EXISTS `height` double NOT NULL DEFAULT 18 AFTER `width`;
