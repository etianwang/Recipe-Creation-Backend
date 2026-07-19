import { Inject, Injectable } from '@nestjs/common';
import {
  AI_PROVIDER,
  type AiChatMessage,
  type AiProvider,
} from './provider/ai-provider';

@Injectable()
export class AiClientService {
  constructor(@Inject(AI_PROVIDER) private readonly provider: AiProvider) {}

  get providerName(): string {
    return this.provider.name;
  }

  complete(messages: AiChatMessage[], opts?: { jsonMode?: boolean }) {
    return this.provider.complete({
      messages,
      temperature: 0.2,
      jsonMode: opts?.jsonMode,
    });
  }
}
