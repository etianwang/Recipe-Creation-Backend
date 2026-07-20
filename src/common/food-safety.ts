/** 不应入库的高风险食材（未充分烹饪可能中毒等） */
export const EXCLUDED_INGREDIENTS = new Set([
  '河豚',
  '毒蘑菇',
  '野生蘑菇',
  '苦杏仁',
  '木薯',
  '发芽土豆',
  '未熟四季豆',
  '鲜黄花菜',
  '鲜银耳',
  '未熟豆浆',
]);

/**
 * 同一道菜中不宜搭配的食材对（民间禁忌 + 常见食品安全提示）。
 * 顺序无关。
 */
export const FORBIDDEN_PAIRS: ReadonlyArray<[string, string]> = [
  ['柿子', '蟹'],
  ['柿子', '虾'],
  ['柿子', '鱼'],
  ['蜂蜜', '豆腐'],
  ['蜂蜜', '洋葱'],
  ['山楂', '虾'],
  ['山楂', '蟹'],
  ['山楂', '鱼'],
  ['啤酒', '虾'],
  ['啤酒', '蟹'],
  ['啤酒', '鱼'],
  ['牛奶', '蟹'],
  ['牛奶', '虾'],
  ['菠菜', '豆腐'],
  ['苋菜', '鳖'],
  ['鹅', '梨'],
  ['鸡蛋', '豆浆'],
  ['甘草', '鱼'],
  ['南瓜', '羊肉'],
  ['螃蟹', '柿子'],
  ['螃蟹', '梨'],
  ['螃蟹', '冷饮'],
];

function pairKey(a: string, b: string): string {
  return a < b ? `${a}\0${b}` : `${b}\0${a}`;
}

const forbiddenSet = new Set(
  FORBIDDEN_PAIRS.map(([a, b]) => pairKey(a, b)),
);

export function isSafeIngredientCombination(names: readonly string[]): boolean {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  for (const name of unique) {
    if (EXCLUDED_INGREDIENTS.has(name)) return false;
  }
  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      if (forbiddenSet.has(pairKey(unique[i], unique[j]))) return false;
    }
  }
  return true;
}
