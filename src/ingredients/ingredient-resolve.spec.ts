import { canonicalizeIngredientName } from './ingredient-resolve';

describe('ingredient-resolve', () => {
  it('maps common aliases to canonical names', () => {
    expect(canonicalizeIngredientName('葱')).toBe('大葱');
    expect(canonicalizeIngredientName('姜')).toBe('生姜');
    expect(canonicalizeIngredientName('西兰花')).toBe('西蓝花');
  });

  it('keeps canonical names unchanged', () => {
    expect(canonicalizeIngredientName('大葱')).toBe('大葱');
    expect(canonicalizeIngredientName('胡椒粉')).toBe('胡椒粉');
  });
});
