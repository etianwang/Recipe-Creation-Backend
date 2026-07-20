import { KnowledgeSource, RecipeSource } from '@prisma/client';
import { PurgeAiService } from './purge-ai.service';

describe('PurgeAiService', () => {
  const prisma = {
    aiGeneratedRecipe: { deleteMany: jest.fn() },
    aiQueryCache: { deleteMany: jest.fn() },
    aiQueryLog: { deleteMany: jest.fn() },
    recipe: { deleteMany: jest.fn() },
    ingredientSubstitute: { deleteMany: jest.fn() },
    ingredient: { findMany: jest.fn(), deleteMany: jest.fn() },
  };

  const service = new PurgeAiService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.aiGeneratedRecipe.deleteMany.mockResolvedValue({ count: 2 });
    prisma.aiQueryCache.deleteMany.mockResolvedValue({ count: 3 });
    prisma.aiQueryLog.deleteMany.mockResolvedValue({ count: 4 });
    prisma.recipe.deleteMany.mockResolvedValue({ count: 5 });
    prisma.ingredientSubstitute.deleteMany.mockResolvedValue({ count: 1 });
    prisma.ingredient.findMany.mockResolvedValue([{ id: 'i1' }, { id: 'i2' }]);
    prisma.ingredient.deleteMany.mockResolvedValue({ count: 2 });
  });

  it('purges AI recipes, cache, substitutes, and orphan ingredients (TR-SYS-001)', async () => {
    const result = await service.purge();

    expect(prisma.recipe.deleteMany).toHaveBeenCalledWith({
      where: { source: RecipeSource.AI },
    });
    expect(prisma.ingredientSubstitute.deleteMany).toHaveBeenCalledWith({
      where: { source: KnowledgeSource.AI },
    });
    expect(prisma.aiQueryCache.deleteMany).toHaveBeenCalled();
    expect(result).toEqual({
      recipesDeleted: 5,
      cacheDeleted: 3,
      logsDeleted: 4,
      generatedDeleted: 2,
      substitutesDeleted: 1,
      orphanIngredientsDeleted: 2,
    });
  });

  it('skips recipes when recipes=false', async () => {
    await service.purge({ recipes: false });
    expect(prisma.recipe.deleteMany).not.toHaveBeenCalled();
    expect(prisma.aiQueryCache.deleteMany).toHaveBeenCalled();
  });
});
