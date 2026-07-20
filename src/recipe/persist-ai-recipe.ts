import {
  IngredientCategory,
  KnowledgeSource,
  MaterialType,
  Prisma,
  PrismaClient,
  RecipeSource,
  RecipeStatus,
} from '@prisma/client';
import type { ParsedRecipe } from '../ai/parse/parse-recipe-json';
import { isSafeIngredientCombination } from '../common/food-safety';

export function mapMaterialType(type: string): MaterialType {
  switch (type) {
    case '主料':
      return MaterialType.MAIN;
    case '辅料':
      return MaterialType.SIDE;
    case '调料':
    case '调味料':
      return MaterialType.SEASONING;
    case '香料':
      return MaterialType.SPICE;
    default:
      return MaterialType.OTHER;
  }
}

export function guessIngredientCategory(type: string): IngredientCategory {
  switch (mapMaterialType(type)) {
    case MaterialType.MAIN:
      return IngredientCategory.MAIN;
    case MaterialType.SIDE:
      return IngredientCategory.SIDE;
    case MaterialType.SEASONING:
      return IngredientCategory.SEASONING;
    case MaterialType.SPICE:
      return IngredientCategory.SPICE;
    default:
      return IngredientCategory.SIDE;
  }
}

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/** 将单条 AI 菜谱写入正式库（已存在同名则复用 id） */
export async function persistOneAiRecipe(
  tx: Tx,
  recipe: ParsedRecipe,
  queryHash: string,
): Promise<string> {
  const name = recipe.name.trim();
  if (!name || !Array.isArray(recipe.ingredients)) {
    throw new Error('Invalid AI recipe');
  }

  const existing = await tx.recipe.findFirst({ where: { name } });
  if (existing) {
    const linked = await tx.aiGeneratedRecipe.findFirst({
      where: { queryHash, linkedRecipeId: existing.id },
    });
    if (!linked) {
      await tx.aiGeneratedRecipe.create({
        data: {
          queryHash,
          linkedRecipeId: existing.id,
          payload: { recipe } as unknown as Prisma.InputJsonValue,
        },
      });
    }
    return existing.id;
  }

  const ingredientIds: {
    id: string;
    type: MaterialType;
    required: boolean;
  }[] = [];

  for (const item of recipe.ingredients) {
    const ingName = item.name.trim();
    if (!ingName) continue;
    const row = await tx.ingredient.upsert({
      where: { name: ingName },
      create: {
        name: ingName,
        category: guessIngredientCategory(item.type),
      },
      update: {},
    });
    ingredientIds.push({
      id: row.id,
      type: mapMaterialType(item.type),
      required: item.required !== false,
    });
  }

  const created = await tx.recipe.create({
    data: {
      name,
      source: RecipeSource.AI,
      confidence: recipe.confidence,
      status: RecipeStatus.PUBLISHED,
      materials: {
        create: ingredientIds.map((m) => ({
          ingredientId: m.id,
          type: m.type,
          required: m.required,
        })),
      },
    },
  });

  if (Array.isArray(recipe.substitutes)) {
    for (const sub of recipe.substitutes) {
      const from = await tx.ingredient.upsert({
        where: { name: sub.from.trim() },
        create: {
          name: sub.from.trim(),
          category: IngredientCategory.SEASONING,
        },
        update: {},
      });
      for (const to of sub.to) {
        const toRow = await tx.ingredient.upsert({
          where: { name: to.name.trim() },
          create: {
            name: to.name.trim(),
            category: IngredientCategory.SEASONING,
          },
          update: {},
        });
        await tx.ingredientSubstitute.upsert({
          where: {
            ingredientId_substituteId: {
              ingredientId: from.id,
              substituteId: toRow.id,
            },
          },
          create: {
            ingredientId: from.id,
            substituteId: toRow.id,
            score: to.score,
            source: KnowledgeSource.AI,
          },
          update: {
            score: to.score,
            source: KnowledgeSource.AI,
          },
        });
      }
    }
  }

  await tx.aiGeneratedRecipe.create({
    data: {
      queryHash,
      linkedRecipeId: created.id,
      payload: { recipe } as unknown as Prisma.InputJsonValue,
    },
  });

  return created.id;
}

export async function persistAiRecipes(
  prisma: Pick<PrismaClient, '$transaction'>,
  queryHash: string,
  recipes: ParsedRecipe[],
): Promise<string[]> {
  const ids: string[] = [];
  await prisma.$transaction(async (tx) => {
    for (const recipe of recipes) {
      const materialNames = recipe.ingredients
        .map((i) => i.name.trim())
        .filter(Boolean);
      if (!isSafeIngredientCombination(materialNames)) continue;
      ids.push(await persistOneAiRecipe(tx, recipe, queryHash));
    }
  });
  return ids;
}
