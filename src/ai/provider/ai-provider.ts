export type AiChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type AiCompletionRequest = {
  messages: AiChatMessage[];
  temperature?: number;
  /** Force JSON object mode when provider supports it */
  jsonMode?: boolean;
};

export type AiCompletionResult = {
  content: string;
  model: string;
  provider: string;
};

export interface AiProvider {
  readonly name: string;
  complete(request: AiCompletionRequest): Promise<AiCompletionResult>;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');
