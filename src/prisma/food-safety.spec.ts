import {
  isSafeIngredientCombination,
  FORBIDDEN_PAIRS,
} from '../common/food-safety';
import {
  SAFE_CATALOG_RECIPES,
  buildSafeBulkRecipes,
  assertCatalogRecipesSafe,
} from '../../prisma/seed-catalog';

describe('food-safety', () => {
  it('rejects known forbidden pairs', () => {
    expect(isSafeIngredientCombination(['柿子', '蟹'])).toBe(false);
    expect(isSafeIngredientCombination(['蜂蜜', '豆腐'])).toBe(false);
  });

  it('allows common safe combinations', () => {
    expect(isSafeIngredientCombination(['鸡肉', '土豆', '青椒'])).toBe(true);
    expect(isSafeIngredientCombination(['番茄', '鸡蛋'])).toBe(true);
  });

  it('catalog recipes are all safe', () => {
    assertCatalogRecipesSafe();
    expect(SAFE_CATALOG_RECIPES.length).toBeGreaterThan(40);
  });

  it('bulk recipes pass safety check', () => {
    const bulk = buildSafeBulkRecipes(200);
    expect(bulk.length).toBeGreaterThan(100);
    for (const r of bulk) {
      expect(isSafeIngredientCombination(r.materials.map((m) => m.name))).toBe(
        true,
      );
    }
  });

  it('has forbidden pairs defined', () => {
    expect(FORBIDDEN_PAIRS.length).toBeGreaterThan(5);
  });
});
