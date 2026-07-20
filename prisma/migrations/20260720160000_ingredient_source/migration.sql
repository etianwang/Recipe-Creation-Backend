-- AlterTable
ALTER TABLE `ingredients` ADD COLUMN `source` ENUM('MANUAL', 'AI') NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE INDEX `ingredients_source_idx` ON `ingredients`(`source`);
