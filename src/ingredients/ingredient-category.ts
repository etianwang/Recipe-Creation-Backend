import { IngredientCategory } from '@prisma/client';

const ZH_TO_CATEGORY: Record<string, IngredientCategory> = {
  主料: IngredientCategory.MAIN,
  辅料: IngredientCategory.SIDE,
  调味料: IngredientCategory.SEASONING,
  调料: IngredientCategory.SEASONING,
  香料: IngredientCategory.SPICE,
  饮品: IngredientCategory.DRINK,
};

const CATEGORY_TO_ZH: Record<IngredientCategory, string> = {
  MAIN: '主料',
  SIDE: '辅料',
  SEASONING: '调味料',
  SPICE: '香料',
  DRINK: '饮品',
};

export function parseCategory(
  input?: string,
): IngredientCategory | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const upper = trimmed.toUpperCase();
  if (
    Object.values(IngredientCategory).includes(upper as IngredientCategory)
  ) {
    return upper as IngredientCategory;
  }

  return ZH_TO_CATEGORY[trimmed];
}

export function categoryLabel(category: IngredientCategory): string {
  return CATEGORY_TO_ZH[category];
}
