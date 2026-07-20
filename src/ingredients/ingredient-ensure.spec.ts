import { IngredientCategory, KnowledgeSource } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { ensureIngredientByName } from './ingredient-ensure';

describe('ensureIngredientByName', () => {
  const ingredient = {
    id: 'i1',
    name: '番茄',
    category: IngredientCategory.MAIN,
    taste: null,
    description: null,
    source: KnowledgeSource.MANUAL,
    createdAt: new Date(),
  };

  it('returns existing row without create', async () => {
    const db = {
      ingredient: {
        findUnique: jest.fn().mockResolvedValue(ingredient),
        create: jest.fn(),
      },
    };

    const row = await ensureIngredientByName(
      db,
      '西红柿',
      IngredientCategory.MAIN,
    );

    expect(row).toBe(ingredient);
    expect(db.ingredient.create).not.toHaveBeenCalled();
  });

  it('creates when missing with AI source', async () => {
    const db = {
      ingredient: {
        findUnique: jest.fn().mockResolvedValueOnce(null),
        create: jest.fn().mockResolvedValue({
          ...ingredient,
          source: KnowledgeSource.AI,
        }),
      },
    };

    const row = await ensureIngredientByName(
      db,
      '番茄',
      IngredientCategory.MAIN,
      { source: KnowledgeSource.AI },
    );

    expect(row.source).toBe(KnowledgeSource.AI);
    expect(db.ingredient.create).toHaveBeenCalledWith({
      data: {
        name: '番茄',
        category: IngredientCategory.MAIN,
        taste: null,
        description: null,
        source: KnowledgeSource.AI,
      },
    });
  });

  it('retries read after concurrent unique conflict (P2002)', async () => {
    const uniqueErr = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: 'test' },
    );
    const db = {
      ingredient: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(ingredient),
        create: jest.fn().mockRejectedValue(uniqueErr),
      },
    };

    const row = await ensureIngredientByName(db, '番茄', IngredientCategory.MAIN);

    expect(row).toBe(ingredient);
    expect(db.ingredient.findUnique).toHaveBeenCalledTimes(2);
  });
});
