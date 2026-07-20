import { Injectable } from '@nestjs/common';
import {
  AiCompletionRequest,
  AiCompletionResult,
  AiProvider,
} from './ai-provider';

@Injectable()
export class FakeAiProvider implements AiProvider {
  readonly name = 'fake';
  callCount = 0;

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    this.callCount += 1;
    const user = [...request.messages].reverse().find((m) => m.role === 'user');
    const hint = user?.content ?? '';
    const names = Array.from(
      hint.matchAll(/Available ingredients \(normalized\): ([^\n]+)/g),
    )[0]?.[1]
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? ['牛肉', '番茄', '洋葱'];

    const countMatch = hint.match(/propose (\d+) distinct/);
    const count = Math.min(5, Number(countMatch?.[1] || 1));

    const recipes = Array.from({ length: count }, (_, i) => ({
      name: `${names[0] || '食材'}创意菜${i + 1}`,
      ingredients: names.map((name) => ({
        name,
        type: '主料',
        required: true,
        amount: '200g',
      })).concat([
        { name: '盐', type: '调料', required: true, amount: '适量' },
      ]),
      steps: ['准备食材', '下锅烹煮', '调味出锅'],
      substitutes: [
        {
          from: '盐',
          to: [{ name: '酱油', score: 40 }],
        },
      ],
      confidence: 0.85 - i * 0.05,
    }));

    const content = JSON.stringify({ recipes });

    return {
      content,
      model: 'fake-v1',
      provider: this.name,
    };
  }
}
