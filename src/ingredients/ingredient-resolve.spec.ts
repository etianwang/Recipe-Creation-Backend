import { canonicalizeIngredientName } from './ingredient-resolve';

describe('canonicalizeIngredientName', () => {
  it('maps common aliases to canonical names', () => {
    expect(canonicalizeIngredientName('葱')).toBe('大葱');
    expect(canonicalizeIngredientName('姜')).toBe('生姜');
    expect(canonicalizeIngredientName('西兰花')).toBe('西蓝花');
    expect(canonicalizeIngredientName('西红柿')).toBe('番茄');
    expect(canonicalizeIngredientName('意大利面')).toBe('意面');
    expect(canonicalizeIngredientName('mozzarella')).toBe('马苏里拉');
    expect(canonicalizeIngredientName('生抽酱油')).toBe('生抽');
  });

  it('keeps already-canonical names', () => {
    expect(canonicalizeIngredientName('大葱')).toBe('大葱');
    expect(canonicalizeIngredientName('胡椒粉')).toBe('胡椒粉');
  });
});
