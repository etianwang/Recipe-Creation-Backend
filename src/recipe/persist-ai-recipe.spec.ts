import { isAiMaterialRequired } from './persist-ai-recipe';

describe('isAiMaterialRequired', () => {
  it('marks 主料 as required', () => {
    expect(isAiMaterialRequired({ type: '主料', required: false })).toBe(true);
  });

  it('marks 调料/香料/饮品 as optional', () => {
    expect(isAiMaterialRequired({ type: '调料', required: true })).toBe(false);
    expect(isAiMaterialRequired({ type: '香料', required: true })).toBe(false);
    expect(isAiMaterialRequired({ type: '饮品', required: true })).toBe(false);
  });

  it('follows AI required for 辅料', () => {
    expect(isAiMaterialRequired({ type: '辅料', required: true })).toBe(true);
    expect(isAiMaterialRequired({ type: '辅料', required: false })).toBe(false);
  });
});
