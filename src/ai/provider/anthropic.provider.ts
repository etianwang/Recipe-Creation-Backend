import { Injectable } from '@nestjs/common';
import {
  AiChatMessage,
  AiCompletionRequest,
  AiCompletionResult,
  AiProvider,
} from './ai-provider';
import { AppError, ErrorCodes } from '../../common/errors';

/**
 * Anthropic Messages API compatible client
 * (official Anthropic or Claude-compatible gateways).
 *
 * Env:
 * - ANTHROPIC_BASE_URL (e.g. https://api.anthropic.com or gateway)
 * - ANTHROPIC_AUTH_TOKEN / ANTHROPIC_API_KEY
 * - AI_MODEL (e.g. claude-3-5-sonnet-20241022)
 */
@Injectable()
export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly timeoutMs: number,
  ) {}

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    const root = this.baseUrl.replace(/\/$/, '');
    const url = root.endsWith('/v1')
      ? `${root}/messages`
      : `${root}/v1/messages`;

    const systemParts = request.messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content);
    const messages = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })) as { role: 'user' | 'assistant'; content: string }[];

    // Anthropic requires alternating user/assistant and starting with user
    const normalized = this.normalizeMessages(messages);

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 2048,
      temperature: request.temperature ?? 0.2,
      messages: normalized,
    };
    if (systemParts.length) {
      body.system = systemParts.join('\n\n');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          Authorization: `Bearer ${this.apiKey}`,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new AppError(
          ErrorCodes.AI_PROVIDER_FAILED,
          `Anthropic HTTP ${res.status}: ${text.slice(0, 300)}`,
          502,
        );
      }

      const json = (await res.json()) as {
        content?: { type?: string; text?: string }[];
        model?: string;
        error?: { message?: string };
      };

      const text = (json.content ?? [])
        .filter((c) => c.type === 'text' || !!c.text)
        .map((c) => c.text ?? '')
        .join('\n')
        .trim();

      if (!text) {
        throw new AppError(
          ErrorCodes.AI_PROVIDER_FAILED,
          json.error?.message || 'Anthropic returned empty content',
          502,
        );
      }

      return {
        content: text,
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
        err instanceof Error ? err.message : 'Anthropic provider failed',
        502,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private normalizeMessages(
    messages: { role: 'user' | 'assistant'; content: string }[],
  ): { role: 'user' | 'assistant'; content: string }[] {
    if (!messages.length) {
      return [{ role: 'user', content: 'Hello' }];
    }
    const out: { role: 'user' | 'assistant'; content: string }[] = [];
    for (const msg of messages) {
      const last = out[out.length - 1];
      if (last && last.role === msg.role) {
        last.content = `${last.content}\n${msg.content}`;
      } else {
        out.push({ ...msg });
      }
    }
    if (out[0].role !== 'user') {
      out.unshift({ role: 'user', content: '(continue)' });
    }
    return out;
  }
}
