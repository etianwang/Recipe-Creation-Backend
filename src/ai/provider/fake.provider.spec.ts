import { FakeAiProvider } from './fake.provider';

describe('FakeAiProvider (T-AI-01)', () => {
  it('returns deterministic JSON-like content', async () => {
    const provider = new FakeAiProvider();
    const result = await provider.complete({
      messages: [
        {
          role: 'user',
          content: 'Available ingredients (normalized): 牛肉, 番茄, 洋葱',
        },
      ],
    });
    expect(result.provider).toBe('fake');
    const parsed = JSON.parse(result.content) as { name: string };
    expect(parsed.name).toContain('创意煲');
    expect(provider.callCount).toBe(1);
  });
});
