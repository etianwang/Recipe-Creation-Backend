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
import { ensureIngredientByName } from '../ingredients/ingredient-ensure';

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
  queryIngredients: string[] = [],
): Promise<string> {
  const name = recipe.name.trim();
  if (!name || !Array.isArray(recipe.ingredients)) {
    throw new Error('Invalid AI recipe');
  }

  const querySet = new Set(
    queryIngredients.map((n) => n.trim()).filter(Boolean),
  );

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
    const row = await ensureIngredientByName(
      tx,
      ingName,
      guessIngredientCategory(item.type),
    );
    // 用户本次提供的食材为必选，其余可选 → 同组合再次搜索匹配度易于 >40%
    const required =
      querySet.size > 0 ? querySet.has(ingName) : item.required !== false;
    ingredientIds.push({
      id: row.id,
      type: mapMaterialType(item.type),
      required,
    });
  }

  // 若 AI 未包含任何用户食材，至少把用户食材挂为必选，避免无法命中
  if (querySet.size > 0) {
    const linkedNames = new Set(
      recipe.ingredients.map((i) => i.name.trim()).filter(Boolean),
    );
    for (const qName of querySet) {
      if (linkedNames.has(qName)) continue;
      const row = await ensureIngredientByName(
        tx,
        qName,
        IngredientCategory.MAIN,
      );
      ingredientIds.push({
        id: row.id,
        type: MaterialType.MAIN,
        required: true,
      });
    }
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
      const from = await ensureIngredientByName(
        tx,
        sub.from.trim(),
        IngredientCategory.SEASONING,
      );
      for (const to of sub.to) {
        const toRow = await ensureIngredientByName(
          tx,
          to.name.trim(),
          IngredientCategory.SEASONING,
        );
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
  queryIngredients: string[] = [],
): Promise<string[]> {
  const ids: string[] = [];
  await prisma.$transaction(async (tx) => {
    for (const recipe of recipes) {
      const materialNames = recipe.ingredients
        .map((i) => i.name.trim())
        .filter(Boolean);
      if (!isSafeIngredientCombination(materialNames)) continue;
      ids.push(
        await persistOneAiRecipe(tx, recipe, queryHash, queryIngredients),
      );
    }
  });
  return ids;
}
