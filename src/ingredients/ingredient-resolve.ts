import type { Ingredient, PrismaClient } from '@prisma/client';
import { AppError, ErrorCodes } from '../common/errors';

/** 口语/菜谱简称 → 食材库标准名 */
export const INGREDIENT_NAME_ALIASES: Record<string, string> = {
  葱: '大葱',
  香葱: '大葱',
  青葱: '大葱',
  洋葱头: '洋葱',
  葱头: '洋葱',
  姜: '生姜',
  蒜: '大蒜',
  蒜头: '大蒜',
  西兰花: '西蓝花',
  花椰菜: '西蓝花',
  西红柿: '番茄',
  蕃茄: '番茄',
  马铃薯: '土豆',
  地瓜: '红薯',
  番薯: '红薯',
  胡椒: '胡椒粉',
  花椒面: '花椒',
  干辣椒段: '干辣椒',
};

export function canonicalizeIngredientName(name: string): string {
  const trimmed = name.trim();
  return INGREDIENT_NAME_ALIASES[trimmed] ?? trimmed;
}

export type ResolvedIngredient = {
  ingredient: Ingredient;
  query: string;
  /** 用户原始输入（trim 后），与标准名不同时表示做了别名/模糊匹配 */
  resolvedFrom?: string;
};

function pickUniqueFuzzy(
  query: string,
  candidates: Ingredient[],
): Ingredient | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const starts = candidates.filter((c) => c.name.startsWith(query));
  if (starts.length === 1) return starts[0];

  return null;
}

export async function resolveIngredientByName(
  prisma: Pick<PrismaClient, 'ingredient'>,
  rawName: string,
): Promise<ResolvedIngredient> {
  const query = rawName?.trim();
  if (!query) {
    throw new AppError(ErrorCodes.INVALID_PARAM, '请提供食材名称', 400);
  }

  const canonical = canonicalizeIngredientName(query);

  const exact = await prisma.ingredient.findFirst({
    where: { name: canonical },
  });
  if (exact) {
    return {
      ingredient: exact,
      query,
      resolvedFrom: canonical !== query ? query : undefined,
    };
  }

  if (canonical !== query) {
    throw new AppError(
      ErrorCodes.NOT_FOUND_INGREDIENT,
      `食材库中暂无「${query}」（已尝试匹配「${canonical}」）`,
      404,
    );
  }

  if (query.length >= 2) {
    const fuzzy = await prisma.ingredient.findMany({
      where: {
        OR: [{ name: { contains: query } }, { name: { startsWith: query } }],
      },
      take: 8,
    });
    const picked = pickUniqueFuzzy(query, fuzzy);
    if (picked) {
      return { ingredient: picked, query, resolvedFrom: query };
    }
  }

  throw new AppError(
    ErrorCodes.NOT_FOUND_INGREDIENT,
    `食材库中暂无「${query}」，请从食材页搜索标准名称`,
    404,
  );
}
