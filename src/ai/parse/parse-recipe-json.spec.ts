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

  it('accepts fenced JSON', () => {
    const recipe = parseRecipeJson(
      '```json\n{"name":"汤","ingredients":["水"],"steps":[],"substitutes":[],"confidence":80}\n```',
    );
    expect(recipe.name).toBe('汤');
    expect(recipe.confidence).toBe(0.8);
  });
});
