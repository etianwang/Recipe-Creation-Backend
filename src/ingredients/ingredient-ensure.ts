import {
  Ingredient,
  IngredientCategory,
  KnowledgeSource,
  Prisma,
} from '@prisma/client';
import { canonicalizeIngredientName } from './ingredient-resolve';

type IngredientClient = {
  ingredient: {
    findUnique: (args: {
      where: { name: string };
    }) => Promise<Ingredient | null>;
    create: (args: {
      data: {
        name: string;
        category: IngredientCategory;
        taste?: string | null;
        description?: string | null;
        source?: KnowledgeSource;
      };
    }) => Promise<Ingredient>;
  };
};

function isUniqueNameConflict(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002'
  );
}

/** 并发安全：先查后建，唯一键冲突时再读一次；名称经同义名规范化 */
export async function ensureIngredientByName(
  db: IngredientClient,
  rawName: string,
  category: IngredientCategory,
  extras?: {
    taste?: string | null;
    description?: string | null;
    source?: KnowledgeSource;
  },
): Promise<Ingredient> {
  const name = canonicalizeIngredientName(rawName);
  if (!name) {
    throw new Error('Empty ingredient name');
  }

  const existing = await db.ingredient.findUnique({ where: { name } });
  if (existing) return existing;

  try {
    return await db.ingredient.create({
      data: {
        name,
        category,
        taste: extras?.taste?.trim() || null,
        description: extras?.description?.trim() || null,
        source: extras?.source ?? KnowledgeSource.MANUAL,
      },
    });
  } catch (err) {
    if (isUniqueNameConflict(err)) {
      const again = await db.ingredient.findUnique({ where: { name } });
      if (again) return again;
    }
    throw err;
  }
}
