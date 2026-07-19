import { IngredientCategory } from '@prisma/client';
import { parseCategory, categoryLabel } from './ingredient-category';

describe('ingredient-category', () => {
  it('parses Chinese and enum category', () => {
    expect(parseCategory('主料')).toBe(IngredientCategory.MAIN);
    expect(parseCategory('调味料')).toBe(IngredientCategory.SEASONING);
    expect(parseCategory('MAIN')).toBe(IngredientCategory.MAIN);
    expect(parseCategory('unknown')).toBeUndefined();
  });

  it('maps label', () => {
    expect(categoryLabel(IngredientCategory.SPICE)).toBe('香料');
  });
});
