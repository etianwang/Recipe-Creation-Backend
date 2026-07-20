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
    case '饮品':
      return MaterialType.OTHER;
    default:
      return MaterialType.OTHER;
  }
}

export function guessIngredientCategory(type: string): IngredientCategory {
  switch (type.trim()) {
    case '主料':
      return IngredientCategory.MAIN;
    case '辅料':
      return IngredientCategory.SIDE;
    case '调料':
    case '调味料':
      return IngredientCategory.SEASONING;
    case '香料':
      return IngredientCategory.SPICE;
    case '饮品':
      return IngredientCategory.DRINK;
    default:
      return IngredientCategory.SIDE;
  }
}

/** AI 材料是否计入匹配度必选：主料必选；调料/香料/饮品可选；辅料跟 AI 的 required */
export function isAiMaterialRequired(item: {
  type: string;
  required?: boolean;
}): boolean {
  const type = item.type.trim();
  if (type === '主料') return true;
  if (type === '调料' || type === '调味料' || type === '香料' || type === '饮品') {
    return false;
  }
  // 辅料及其他：尊重 AI 的 required（默认 true）
  return item.required !== false;
}

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/** 按 AI type 分类写入缺失食材，并 upsert 替代边（不创建菜谱） */
export async function ensureAiIngredientsAndSubstitutes(
  tx: Tx,
  recipe: ParsedRecipe,
): Promise<
  { id: string; type: MaterialType; required: boolean }[]
> {
  const ingredientIds: {
    id: string;
    type: MaterialType;
    required: boolean;
  }[] = [];

  for (const item of recipe.ingredients ?? []) {
    const ingName = item.name.trim();
    if (!ingName) continue;
    const row = await ensureIngredientByName(
      tx,
      ingName,
      guessIngredientCategory(item.type),
      { source: KnowledgeSource.AI },
    );
    ingredientIds.push({
      id: row.id,
      type: mapMaterialType(item.type),
      required: isAiMaterialRequired(item),
    });
  }

  if (Array.isArray(recipe.substitutes)) {
    for (const sub of recipe.substitutes) {
      const fromName = sub.from?.trim();
      if (!fromName) continue;
      const from = await ensureIngredientByName(
        tx,
        fromName,
        IngredientCategory.SEASONING,
        { source: KnowledgeSource.AI },
      );
      for (const to of sub.to ?? []) {
        const toName = to.name?.trim();
        if (!toName) continue;
        const toRow = await ensureIngredientByName(
          tx,
          toName,
          IngredientCategory.SEASONING,
          { source: KnowledgeSource.AI },
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

  return ingredientIds;
}

async function syncRecipeMaterials(
  tx: Tx,
  recipeId: string,
  materials: { id: string; type: MaterialType; required: boolean }[],
): Promise<void> {
  for (const m of materials) {
    await tx.recipeMaterial.upsert({
      where: {
        recipeId_ingredientId: {
          recipeId,
          ingredientId: m.id,
        },
      },
      create: {
        recipeId,
        ingredientId: m.id,
        type: m.type,
        required: m.required,
      },
      update: {
        type: m.type,
        required: m.required,
      },
    });
  }
}

/** 将单条 AI 菜谱写入正式库（已存在同名则复用 id，仍同步配料/替代） */
export async function persistOneAiRecipe(
  tx: Tx,
  recipe: ParsedRecipe,
  queryHash: string,
  _queryIngredients: string[] = [],
): Promise<string> {
  const name = recipe.name.trim();
  if (!name || !Array.isArray(recipe.ingredients)) {
    throw new Error('Invalid AI recipe');
  }

  const ingredientIds = await ensureAiIngredientsAndSubstitutes(tx, recipe);

  const existing = await tx.recipe.findFirst({ where: { name } });
  if (existing) {
    await syncRecipeMaterials(tx, existing.id, ingredientIds);
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
      if (!isSafeIngredientCombination(materialNames)) {
        // 不安全组合不建菜，但食材仍按分类入库，避免展示名点进替代时报「库中暂无」
        await ensureAiIngredientsAndSubstitutes(tx, recipe);
        continue;
      }
      ids.push(
        await persistOneAiRecipe(tx, recipe, queryHash, queryIngredients),
      );
    }
  });
  return ids;
}
