-- Allow the same photo to appear multiple times on one wall.
-- Safe to run repeatedly on MariaDB 11.x.

USE `photo`;

ALTER TABLE `photo_wall_items`
    DROP INDEX IF EXISTS `uq_photo_wall_items_wall_photo`;
