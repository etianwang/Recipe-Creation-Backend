import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiController } from './ai.controller';
import { AiQuotaGuard } from './ai-quota.guard';
import { AiQuotaService } from './ai-quota.service';
import { AiClientService } from './ai-client.service';
import { AiRecipeService } from './ai-recipe.service';
import { AI_PROVIDER } from './provider/ai-provider';
import { AnthropicProvider } from './provider/anthropic.provider';
import { FakeAiProvider } from './provider/fake.provider';
import { OpenAiCompatibleProvider } from './provider/openai-compatible.provider';

function createAiProvider() {
  const mode = (
    process.env.AI_PROVIDER ||
    (process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY
      ? 'anthropic'
      : 'fake')
  ).toLowerCase();

  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 60000);

  if (mode === 'anthropic' || mode === 'claude') {
    const apiKey =
      process.env.ANTHROPIC_AUTH_TOKEN ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.AI_API_KEY ||
      '';
    const baseUrl =
      process.env.ANTHROPIC_BASE_URL ||
      process.env.AI_BASE_URL ||
      'https://api.anthropic.com';
    if (!apiKey) {
      return new FakeAiProvider();
    }
    return new AnthropicProvider(
      apiKey,
      baseUrl,
      process.env.AI_MODEL || 'claude-sonnet-4-6',
      timeoutMs,
    );
  }

  if (mode === 'openai' || mode === 'openai-compatible') {
    const apiKey = process.env.AI_API_KEY || '';
    if (!apiKey) {
      return new FakeAiProvider();
    }
    return new OpenAiCompatibleProvider(
      apiKey,
      process.env.AI_BASE_URL || 'https://api.openai.com/v1',
      process.env.AI_MODEL || 'gpt-4o-mini',
      timeoutMs,
    );
  }

  return new FakeAiProvider();
}

@Module({
  imports: [AuthModule],
  controllers: [AiController],
  providers: [
    AiQuotaService,
    AiQuotaGuard,
    AiClientService,
    AiRecipeService,
    {
      provide: AI_PROVIDER,
      useFactory: createAiProvider,
    },
  ],
  exports: [AiQuotaService, AiClientService, AiRecipeService],
})
export class AiModule {}
