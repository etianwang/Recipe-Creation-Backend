import { computeQueryHash, normalizeIngredientNames } from './query-hash';

describe('query-hash (TR-AI-003)', () => {
  it('normalizes with trim dedupe sort', () => {
    expect(normalizeIngredientNames([' 土豆 ', '鸡肉', '土豆', ''])).toEqual([
      '土豆',
      '鸡肉',
    ]);
  });

  it('is order-independent', () => {
    const a = computeQueryHash(['土豆', '鸡肉', '青椒']);
    const b = computeQueryHash(['青椒', '鸡肉', '土豆']);
    const c = computeQueryHash(['鸡肉', '土豆', '青椒']);
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});
