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

  it('includes ingredient list in user prompt', () => {
    const user = buildRecipeUserPrompt(['鸡肉', '土豆']);
    expect(user).toContain('鸡肉');
    expect(user).toContain('土豆');
    expect(user).toContain('主料 / 辅料 / 调料 / 香料 / 饮品');
  });
});
