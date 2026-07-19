import { Test, TestingModule } from '@nestjs/testing';
import {
  IngredientCategory,
  KnowledgeSource,
  MaterialType,
  RecipeSource,
  ReviewKind,
  ReviewStatus,
} from '@prisma/client';
import { KnowledgeReviewService } from './knowledge-review.service';
import { PrismaService } from '../prisma/prisma.service';

describe('KnowledgeReviewService.approve', () => {
  let service: KnowledgeReviewService;
  const tx = {
    ingredient: { upsert: jest.fn() },
    recipe: { create: jest.fn() },
    ingredientSubstitute: { upsert: jest.fn() },
    aiGeneratedRecipe: { updateMany: jest.fn() },
  };
  const prisma = {
    knowledgeReview: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) =>
      fn(tx),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeReviewService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(KnowledgeReviewService);
  });

  it('materializes AI recipe on approve', async () => {
    prisma.knowledgeReview.findUnique.mockResolvedValue({
      id: 'rev1',
      kind: ReviewKind.RECIPE,
      status: ReviewStatus.PENDING,
      payload: {
        queryHash: 'abc',
        recipe: {
          name: '审核入库测',
          ingredients: [
            { name: '牛肉', type: '主料', required: true },
            { name: '番茄', type: '主料', required: true },
          ],
          steps: [],
          substitutes: [
            { from: '盐', to: [{ name: '酱油', score: 40 }] },
          ],
          confidence: 0.8,
        },
      },
    });
    tx.ingredient.upsert
      .mockResolvedValueOnce({ id: 'i1', name: '牛肉', category: IngredientCategory.MAIN })
      .mockResolvedValueOnce({ id: 'i2', name: '番茄', category: IngredientCategory.MAIN })
      .mockResolvedValueOnce({ id: 'i3', name: '盐', category: IngredientCategory.SEASONING })
      .mockResolvedValueOnce({ id: 'i4', name: '酱油', category: IngredientCategory.SEASONING });
    tx.recipe.create.mockResolvedValue({ id: 'r1', name: '审核入库测' });
    prisma.knowledgeReview.update.mockResolvedValue({
      id: 'rev1',
      status: ReviewStatus.APPROVED,
      decidedAt: new Date(),
    });

    const result = await service.approve('rev1', 'admin1');
    expect(result.recipeId).toBe('r1');
    expect(tx.recipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: RecipeSource.AI,
          name: '审核入库测',
        }),
      }),
    );
    expect(tx.ingredientSubstitute.upsert).toHaveBeenCalled();
    expect(tx.aiGeneratedRecipe.updateMany).toHaveBeenCalled();
  });
});
