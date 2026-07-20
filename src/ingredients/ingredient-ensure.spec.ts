import { IngredientCategory } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { ensureIngredientByName } from './ingredient-ensure';

describe('ensureIngredientByName', () => {
  const ingredient = {
    id: 'i1',
    name: '番茄',
    category: IngredientCategory.MAIN,
    taste: null,
    description: null,
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

  it('creates when missing', async () => {
    const db = {
      ingredient: {
        findUnique: jest.fn().mockResolvedValueOnce(null),
        create: jest.fn().mockResolvedValue(ingredient),
      },
    };

    const row = await ensureIngredientByName(db, '番茄', IngredientCategory.MAIN);

    expect(row).toBe(ingredient);
    expect(db.ingredient.create).toHaveBeenCalledWith({
      data: {
        name: '番茄',
        category: IngredientCategory.MAIN,
        taste: null,
        description: null,
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
