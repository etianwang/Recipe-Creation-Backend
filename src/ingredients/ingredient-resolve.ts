import type { Ingredient, PrismaClient } from '@prisma/client';
import { AppError, ErrorCodes } from '../common/errors';

/** 口语/菜谱简称 → 食材库标准名（入库与检索共用） */
export const INGREDIENT_NAME_ALIASES: Record<string, string> = {
  // 葱姜蒜
  葱: '大葱',
  香葱: '小葱',
  青葱: '小葱',
  葱花: '小葱',
  洋葱头: '洋葱',
  葱头: '洋葱',
  姜: '生姜',
  仔姜: '生姜',
  老姜: '生姜',
  蒜: '大蒜',
  蒜头: '大蒜',
  蒜末: '大蒜',
  蒜蓉: '大蒜',
  // 茄果薯类
  西兰花: '西蓝花',
  花椰菜: '西蓝花',
  西红柿: '番茄',
  蕃茄: '番茄',
  圣女果: '小番茄',
  樱桃番茄: '小番茄',
  马铃薯: '土豆',
  洋芋: '土豆',
  地瓜: '红薯',
  番薯: '红薯',
  甘薯: '红薯',
  // 肉禽
  鸡腿肉: '鸡腿',
  鸡全腿: '鸡腿',
  鸡胸: '鸡胸肉',
  鸡脯肉: '鸡胸肉',
  五花: '五花肉',
  猪五花: '五花肉',
  里脊肉: '里脊',
  猪里脊: '里脊',
  牛腩肉: '牛腩',
  羊肉片: '羊肉',
  羊排肉: '羊排',
  // 水产
  虾仁肉: '虾仁',
  明虾: '虾',
  基围虾仁: '基围虾',
  三文鱼肉: '三文鱼',
  // 菌菇干货
  香菇菇: '香菇',
  花菇: '香菇',
  金针: '金针菇',
  木耳片: '木耳',
  黑木耳: '木耳',
  // 调味
  胡椒: '胡椒粉',
  花椒面: '花椒',
  花椒粉: '花椒',
  干辣椒段: '干辣椒',
  干椒: '干辣椒',
  生抽酱油: '生抽',
  老抽酱油: '老抽',
  味极鲜: '生抽',
  色拉油: '食用油',
  植物油: '食用油',
  菜油: '菜籽油',
  香麻油: '香油',
  麻油: '香油',
  芝麻香油: '芝麻油',
  淀粉水: '淀粉',
  生粉: '淀粉',
  玉米淀粉: '淀粉',
  // 面点主食
  意大利面: '意面',
  意粉: '意面',
  pasta: '意面',
  乌冬: '乌冬面',
  河粉条: '河粉',
  米饭粒: '米饭',
  白米饭: '米饭',
  // 乳制品/西餐
  马苏里拉芝士: '马苏里拉',
  马苏奶酪: '马苏里拉',
  mozzarella: '马苏里拉',
  帕尔马干酪: '帕玛森',
  帕玛森芝士: '帕玛森',
  parmesan: '帕玛森',
  芝士片奶酪: '芝士片',
  淡奶油液: '淡奶油',
  cream: '淡奶油',
  butter: '黄油',
  // 其他
  青红椒: '青椒',
  灯笼椒: '甜椒',
  杭椒丝: '杭椒',
  柠檬片: '柠檬',
  青柠汁: '青柠',
  lime: '青柠',
  椰奶汁: '椰奶',
  椰浆水: '椰浆',
};

export function canonicalizeIngredientName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLowerCase();
  return (
    INGREDIENT_NAME_ALIASES[trimmed] ??
    INGREDIENT_NAME_ALIASES[lower] ??
    trimmed
  );
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
