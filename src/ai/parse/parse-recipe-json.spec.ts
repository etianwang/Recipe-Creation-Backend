import { parseRecipeJson } from './parse-recipe-json';

describe('parseRecipeJson (T-AI-03)', () => {
  it('parses valid recipe JSON', () => {
    const recipe = parseRecipeJson(
      JSON.stringify({
        name: '土豆炒鸡',
        ingredients: [
          { name: '鸡肉', type: '主料', required: true },
          { name: '土豆', type: '主料', required: true },
        ],
        steps: ['切丁', '下锅'],
        substitutes: [],
        confidence: 0.9,
      }),
    );
    expect(recipe.name).toBe('土豆炒鸡');
    expect(recipe.ingredients).toHaveLength(2);
    expect(recipe.confidence).toBe(0.9);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseRecipeJson('not-json')).toThrow('INVALID_JSON');
  });

  it('normalizes invalid type and aliases ingredient names', () => {
    const recipe = parseRecipeJson(
      JSON.stringify({
        name: '西红柿炒蛋',
        ingredients: [
          { name: '西红柿', type: '其他', required: true, amount: '2个' },
          { name: '鸡蛋', type: '调味料', required: true, amount: '2个' },
        ],
        steps: ['炒'],
        substitutes: [],
        confidence: 0.8,
      }),
    );
    expect(recipe.ingredients[0].name).toBe('番茄');
    expect(recipe.ingredients[0].type).toBe('辅料');
    expect(recipe.ingredients[1].type).toBe('调料');
  });
});
