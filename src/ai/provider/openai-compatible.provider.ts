import { Injectable } from '@nestjs/common';
import {
  AiCompletionRequest,
  AiCompletionResult,
  AiProvider,
} from './ai-provider';
import { AppError, ErrorCodes } from '../../common/errors';

/**
 * OpenAI Chat Completions compatible HTTP client
 * (OpenAI / Azure OpenAI / DeepSeek / etc.)
 */
@Injectable()
export class OpenAiCompatibleProvider implements AiProvider {
  readonly name = 'openai-compatible';

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly timeoutMs: number,
  ) {}

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const body: Record<string, unknown> = {
        model: this.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.2,
      };
      if (request.jsonMode) {
        body.response_format = { type: 'json_object' };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new AppError(
          ErrorCodes.AI_PROVIDER_FAILED,
          `AI provider HTTP ${res.status}: ${text.slice(0, 200)}`,
          502,
        );
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        model?: string;
      };
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        throw new AppError(
          ErrorCodes.AI_PROVIDER_FAILED,
          'AI provider returned empty content',
          502,
        );
      }

      return {
        content,
        model: json.model ?? this.model,
        provider: this.name,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new AppError(ErrorCodes.AI_TIMEOUT, 'AI provider timeout', 504);
      }
      throw new AppError(
        ErrorCodes.AI_PROVIDER_FAILED,
        err instanceof Error ? err.message : 'AI provider failed',
        502,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
