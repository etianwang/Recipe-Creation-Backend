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

  it('includes ingredient list in user prompt', () => {
    const user = buildRecipeUserPrompt(['鸡肉', '土豆']);
    expect(user).toContain('鸡肉');
    expect(user).toContain('土豆');
  });
});
