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

  it('splits compound names like 八角1颗+桂皮1小段 (TR-AI-007)', () => {
    const recipe = parseRecipeJson(
      JSON.stringify({
        name: '红烧肉',
        ingredients: [
          {
            name: '八角1颗+桂皮1小段',
            type: '香料',
            required: false,
            amount: '适量',
          },
        ],
        steps: ['炖'],
        substitutes: [],
        confidence: 0.8,
      }),
    );
    expect(recipe.ingredients).toEqual([
      { name: '八角', type: '香料', required: false, amount: '1颗' },
      { name: '桂皮', type: '香料', required: false, amount: '1小段' },
    ]);
  });

  it('strips notes, fractions, leading 少许, and English aliases (TR-AI-007b)', () => {
    const recipe = parseRecipeJson(
      JSON.stringify({
        name: '测试菜',
        ingredients: [
          {
            name: '糙米（需延长浸泡和煮制时间）',
            type: '主料',
            required: true,
            amount: '100g',
          },
          {
            name: '肉桂粉1/4茶匙',
            type: '香料',
            required: false,
            amount: '适量',
          },
          {
            name: '生抽+糖+少许蚝油',
            type: '调料',
            required: false,
            amount: '适量',
          },
          { name: 'cream cheese', type: '辅料', required: false, amount: '50g' },
          { name: 'mascarpone', type: '辅料', required: false, amount: '50g' },
        ],
        steps: ['做'],
        substitutes: [],
        confidence: 0.8,
      }),
    );
    expect(recipe.ingredients).toEqual([
      { name: '糙米', type: '主料', required: true, amount: '100g' },
      { name: '肉桂粉', type: '香料', required: false, amount: '1/4茶匙' },
      { name: '生抽', type: '调料', required: false, amount: '适量' },
      { name: '糖', type: '调料', required: false, amount: '适量' },
      { name: '蚝油', type: '调料', required: false, amount: '少许' },
      { name: '奶油奶酪', type: '辅料', required: false, amount: '50g' },
      { name: '马斯卡彭', type: '辅料', required: false, amount: '50g' },
    ]);
  });
});
