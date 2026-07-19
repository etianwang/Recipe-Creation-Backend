import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { computeQueryHash, normalizeIngredientNames } from '../search/query-hash';
import { AiClientService } from './ai-client.service';
import {
  buildRecipeSystemPrompt,
  buildRecipeUserPrompt,
} from './prompt/recipe-prompt';
import { parseRecipeJson, ParsedRecipe } from './parse/parse-recipe-json';
import { AppError, ErrorCodes } from '../common/errors';

export type AiRecipePipelineResult = {
  queryHash: string;
  normalizedIngredients: string[];
  recipe: ParsedRecipe;
  source: 'cache' | 'ai';
  rawContent?: string;
};

@Injectable()
export class AiRecipeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiClient: AiClientService,
  ) {}

  async generateOrLoad(
    ingredientNames: string[],
  ): Promise<AiRecipePipelineResult> {
    const normalizedIngredients = normalizeIngredientNames(ingredientNames);
    if (normalizedIngredients.length === 0) {
      throw new AppError(
        ErrorCodes.EMPTY_INGREDIENTS,
        'ingredients must not be empty',
        400,
      );
    }

    const queryHash = computeQueryHash(normalizedIngredients);
    const cached = await this.prisma.aiQueryCache.findUnique({
      where: { queryHash },
    });
    if (cached) {
      const recipe = cached.response as unknown as ParsedRecipe;
      return {
        queryHash,
        normalizedIngredients,
        recipe,
        source: 'cache',
      };
    }

    const system = buildRecipeSystemPrompt();
    const user = buildRecipeUserPrompt(normalizedIngredients);
    const completion = await this.aiClient.complete(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { jsonMode: true },
    );

    let recipe: ParsedRecipe;
    let parsedOk = true;
    try {
      recipe = parseRecipeJson(completion.content);
    } catch {
      parsedOk = false;
      await this.prisma.aiQueryLog.create({
        data: {
          queryHash,
          input: normalizedIngredients,
          prompt: `${system}\n\n${user}`,
          rawResponse: completion.content,
          parsedOk: false,
        },
      });
      throw new AppError(
        ErrorCodes.AI_INVALID_JSON,
        'AI output is not valid JSON',
        502,
      );
    }

    await this.prisma.$transaction([
      this.prisma.aiQueryLog.create({
        data: {
          queryHash,
          input: normalizedIngredients,
          prompt: `${system}\n\n${user}`,
          rawResponse: completion.content,
          parsedOk,
        },
      }),
      this.prisma.aiQueryCache.create({
        data: {
          queryHash,
          input: normalizedIngredients,
          response: recipe as unknown as Prisma.InputJsonValue,
        },
      }),
      this.prisma.aiGeneratedRecipe.create({
        data: {
          queryHash,
          payload: recipe as unknown as Prisma.InputJsonValue,
        },
      }),
      this.prisma.knowledgeReview.create({
        data: {
          kind: 'RECIPE',
          payload: {
            queryHash,
            recipe,
            ingredients: normalizedIngredients,
          } as unknown as Prisma.InputJsonValue,
          status: 'PENDING',
        },
      }),
    ]);

    return {
      queryHash,
      normalizedIngredients,
      recipe,
      source: 'ai',
      rawContent: completion.content,
    };
  }
}
