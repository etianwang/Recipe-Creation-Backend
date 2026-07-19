/**
 * Smoke-test Anthropic/Claude compatible gateway.
 *
 * Correct env mapping (user paste had values swapped by name):
 *   ANTHROPIC_BASE_URL=https://...
 *   ANTHROPIC_AUTH_TOKEN=sk-...
 */
import 'dotenv/config';
import { AnthropicProvider } from '../src/ai/provider/anthropic.provider';

function resolveEnv() {
  let baseUrl = process.env.ANTHROPIC_BASE_URL || '';
  let token =
    process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY || '';

  // Auto-fix if user swapped URL/token by mistake
  if (baseUrl.startsWith('sk-') && token.startsWith('http')) {
    const tmp = baseUrl;
    baseUrl = token;
    token = tmp;
    console.warn('[fix] Detected swapped ANTHROPIC_BASE_URL / AUTH_TOKEN');
  }

  return {
    baseUrl: baseUrl || 'https://claude.ai4cn.cloud',
    token,
    model: process.env.AI_MODEL || 'claude-sonnet-4-6',
  };
}

async function main() {
  const { baseUrl, token, model } = resolveEnv();
  if (!token) {
    console.error('Missing ANTHROPIC_AUTH_TOKEN');
    process.exit(1);
  }

  console.log('Testing Anthropic provider...');
  console.log('BASE_URL =', baseUrl);
  console.log('MODEL    =', model);
  console.log('TOKEN    =', `${token.slice(0, 8)}...`);

  const provider = new AnthropicProvider(token, baseUrl, model, 60000);
  const result = await provider.complete({
    messages: [
      {
        role: 'system',
        content:
          'Return ONLY a JSON object: {"name":"string","ingredients":[{"name":"string","type":"主料","required":true}],"steps":["string"],"substitutes":[],"confidence":0.8}',
      },
      {
        role: 'user',
        content:
          'Available ingredients (normalized): 牛肉, 番茄, 洋葱\nTask: propose one cookable recipe as JSON matching the schema.',
      },
    ],
    temperature: 0.2,
    jsonMode: true,
  });

  console.log('provider =', result.provider);
  console.log('model    =', result.model);
  console.log('content  =', result.content.slice(0, 800));
  try {
    JSON.parse(result.content.replace(/^```json\s*|\s*```$/g, '').trim());
    console.log('JSON parse: OK');
  } catch {
    console.log('JSON parse: FAIL (raw text returned — prompt/parser may still recover)');
  }
}

main().catch((err) => {
  console.error('AI test failed:', err);
  process.exit(1);
});
