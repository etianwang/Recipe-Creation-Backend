-- CreateTable
CREATE TABLE `recipe_favorites` (
    `user_id` CHAR(36) NOT NULL,
    `recipe_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `recipe_favorites_recipe_id_idx`(`recipe_id`),
    PRIMARY KEY (`user_id`, `recipe_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `recipe_favorites` ADD CONSTRAINT `recipe_favorites_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe_favorites` ADD CONSTRAINT `recipe_favorites_recipe_id_fkey` FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
