import { Test, TestingModule } from '@nestjs/testing';
import { AiRecipeService } from './ai-recipe.service';
import { AiClientService } from './ai-client.service';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorCodes } from '../common/errors';

jest.mock('../recipe/persist-ai-recipe', () => ({
  persistAiRecipes: jest.fn().mockResolvedValue([]),
}));

import { persistAiRecipes } from '../recipe/persist-ai-recipe';

describe('AiRecipeService cache (T-AI-04 / T-AI-06)', () => {
  let service: AiRecipeService;
  const complete = jest.fn();
  const prisma = {
    aiQueryCache: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    aiQueryLog: { create: jest.fn() },
    aiGeneratedRecipe: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn(async (ops: unknown[]) => ops),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiRecipeService,
        { provide: AiClientService, useValue: { complete } },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(AiRecipeService);
  });

  it('calls AI once, persists recipes, no review queue (TR-AI-001)', async () => {
    prisma.aiQueryCache.findUnique.mockResolvedValue(null);
    complete.mockResolvedValue({
      content: JSON.stringify({
        name: '番茄牛肉煲',
        ingredients: [
          { name: '牛肉', type: '主料', required: true },
          { name: '番茄', type: '主料', required: true },
        ],
        steps: ['炖'],
        substitutes: [],
        confidence: 0.8,
      }),
      model: 'fake',
      provider: 'fake',
    });

    const first = await service.generateOrLoad(['牛肉', '番茄', '洋葱']);
    expect(first.source).toBe('ai');
    expect(complete).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(persistAiRecipes).toHaveBeenCalled();
  });

  it('uses cache, persists to DB, does not call AI again (TR-AI-002)', async () => {
    prisma.aiQueryCache.findUnique.mockResolvedValue({
      queryHash: 'abc',
      response: {
        name: '番茄牛肉煲',
        ingredients: [{ name: '牛肉', type: '主料', required: true, amount: '200g' }],
        steps: ['炖'],
        substitutes: [],
        confidence: 0.8,
      },
    });

    const second = await service.generateOrLoad(['洋葱', '番茄', '牛肉']);
    expect(second.source).toBe('cache');
    expect(complete).not.toHaveBeenCalled();
    expect(persistAiRecipes).toHaveBeenCalled();
  });

  it('throws 40004 on invalid AI JSON (TR-AI-004)', async () => {
    prisma.aiQueryCache.findUnique.mockResolvedValue(null);
    complete.mockResolvedValue({
      content: 'plain text only',
      model: 'fake',
      provider: 'fake',
    });
    await expect(
      service.generateOrLoad(['牛肉', '番茄']),
    ).rejects.toMatchObject({ code: ErrorCodes.AI_INVALID_JSON });
    expect(prisma.aiQueryLog.create).toHaveBeenCalled();
    expect(persistAiRecipes).not.toHaveBeenCalled();
  });
});
