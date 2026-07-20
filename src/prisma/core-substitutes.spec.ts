import { buildCoreSubstitutes } from '../../prisma/core-substitutes';

describe('buildCoreSubstitutes', () => {
  const names = new Set(['盐', '生抽', '糖', '豆瓣酱', '番茄酱']);

  it('includes outgoing substitutes for 盐 (launch requirement)', () => {
    const subs = buildCoreSubstitutes(names);
    const fromSalt = subs.filter((s) => s.from === '盐');
    expect(fromSalt.length).toBeGreaterThanOrEqual(2);
    expect(fromSalt.some((s) => s.to === '生抽')).toBe(true);
  });

  it('drops unknown ingredient names', () => {
    const subs = buildCoreSubstitutes(new Set(['盐', '不存在']));
    expect(subs.every((s) => s.from !== '不存在' && s.to !== '不存在')).toBe(
      true,
    );
  });
});
