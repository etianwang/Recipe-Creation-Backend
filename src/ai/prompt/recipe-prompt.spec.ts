import {
  buildRecipeSystemPrompt,
  buildRecipeUserPrompt,
} from './recipe-prompt';

describe('recipe prompt (T-AI-02)', () => {
  it('requires JSON-only system prompt', () => {
    const system = buildRecipeSystemPrompt();
    expect(system).toContain('ONLY a single JSON object');
    expect(system).toContain('confidence');
  });

  it('locks ingredient.type to allowed categories', () => {
    const system = buildRecipeSystemPrompt();
    expect(system).toContain('"主料"|"辅料"|"调料"|"香料"|"饮品"');
    expect(system).toContain('Never use "其他"');
    expect(system).not.toContain('"其他"|');
  });

  it('allows international home cooking, not Chinese-only (TR-AI-003)', () => {
    const system = buildRecipeSystemPrompt();
    expect(system).toMatch(/Western|Japanese|Korean|Southeast Asian|Middle Eastern/i);
    expect(system).toContain('do NOT force Chinese-only');
    expect(system).not.toMatch(/Chinese-only dishes|only Chinese|仅中式/);
    const user = buildRecipeUserPrompt(['鸡肉', '土豆']);
    expect(user).toContain('not Chinese-only');
  });

  it('requires real existing dishes, forbids inventing mash-ups (TR-AI-004)', () => {
    const system = buildRecipeSystemPrompt();
    expect(system).toMatch(/real, well-known existing dishes/i);
    expect(system).toMatch(/Do NOT invent novel\/fusion/i);
    expect(system).toContain('leave them unused');
    expect(system).toContain('香料蒸蟹配千张午餐肉饼');
    const user = buildRecipeUserPrompt(['鸡肉', '土豆']);
    expect(user).toMatch(/Only real existing dish names/i);
  });

  it('includes ingredient list in user prompt', () => {
    const user = buildRecipeUserPrompt(['鸡肉', '土豆']);
    expect(user).toContain('鸡肉');
    expect(user).toContain('土豆');
    expect(user).toContain('主料 / 辅料 / 调料 / 香料 / 饮品');
  });
});
