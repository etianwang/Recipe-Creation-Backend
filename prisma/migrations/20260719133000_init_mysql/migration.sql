-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `openid` VARCHAR(128) NULL,
    `username` VARCHAR(64) NULL,
    `password_hash` VARCHAR(255) NULL,
    `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_openid_key`(`openid`),
    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ingredients` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `category` ENUM('MAIN', 'SIDE', 'SEASONING', 'SPICE', 'DRINK') NOT NULL,
    `taste` VARCHAR(64) NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ingredients_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recipes` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `source` ENUM('MANUAL', 'AI', 'USER') NOT NULL DEFAULT 'MANUAL',
    `confidence` DOUBLE NULL,
    `status` ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'PUBLISHED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `recipes_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recipe_materials` (
    `recipe_id` CHAR(36) NOT NULL,
    `ingredient_id` CHAR(36) NOT NULL,
    `type` ENUM('MAIN', 'SIDE', 'SEASONING', 'SPICE', 'OTHER') NOT NULL,
    `required` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`recipe_id`, `ingredient_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ingredient_substitutes` (
    `ingredient_id` CHAR(36) NOT NULL,
    `substitute_id` CHAR(36) NOT NULL,
    `score` DOUBLE NOT NULL,
    `source` ENUM('MANUAL', 'AI') NOT NULL DEFAULT 'MANUAL',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`ingredient_id`, `substitute_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_query_logs` (
    `id` CHAR(36) NOT NULL,
    `query_hash` VARCHAR(64) NOT NULL,
    `input` JSON NOT NULL,
    `prompt` LONGTEXT NOT NULL,
    `raw_response` LONGTEXT NOT NULL,
    `parsed_ok` BOOLEAN NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_query_logs_query_hash_created_at_idx`(`query_hash`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_query_cache` (
    `query_hash` VARCHAR(64) NOT NULL,
    `input` JSON NOT NULL,
    `response` JSON NOT NULL,
    `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`query_hash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_generated_recipes` (
    `id` CHAR(36) NOT NULL,
    `query_hash` VARCHAR(64) NOT NULL,
    `payload` JSON NOT NULL,
    `linked_recipe_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_generated_recipes_query_hash_idx`(`query_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `knowledge_review` (
    `id` CHAR(36) NOT NULL,
    `kind` ENUM('RECIPE', 'SUBSTITUTE', 'INGREDIENT') NOT NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reviewer_id` CHAR(36) NULL,
    `decided_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `knowledge_review_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `recipe_materials` ADD CONSTRAINT `recipe_materials_recipe_id_fkey` FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe_materials` ADD CONSTRAINT `recipe_materials_ingredient_id_fkey` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ingredient_substitutes` ADD CONSTRAINT `ingredient_substitutes_ingredient_id_fkey` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ingredient_substitutes` ADD CONSTRAINT `ingredient_substitutes_substitute_id_fkey` FOREIGN KEY (`substitute_id`) REFERENCES `ingredients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_generated_recipes` ADD CONSTRAINT `ai_generated_recipes_linked_recipe_id_fkey` FOREIGN KEY (`linked_recipe_id`) REFERENCES `recipes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `knowledge_review` ADD CONSTRAINT `knowledge_review_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
