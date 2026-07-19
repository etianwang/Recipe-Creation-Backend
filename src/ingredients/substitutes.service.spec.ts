import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeSource } from '@prisma/client';
import { SubstitutesService } from './substitutes.service';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorCodes } from '../common/errors';

describe('SubstitutesService', () => {
  let service: SubstitutesService;
  const prisma = {
    ingredient: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    ingredientSubstitute: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubstitutesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(SubstitutesService);
  });

  it('lists substitutes sorted by score desc (TR-SUB-001)', async () => {
    prisma.ingredient.findUnique.mockResolvedValue({
      id: 'p1',
      name: '胡椒粉',
    });
    prisma.ingredientSubstitute.findMany.mockResolvedValue([
      {
        score: 95,
        source: KnowledgeSource.MANUAL,
        substitute: { id: 's1', name: '白胡椒' },
      },
      {
        score: 80,
        source: KnowledgeSource.MANUAL,
        substitute: { id: 's2', name: '黑胡椒' },
      },
    ]);

    const result = await service.listByIngredientId('p1');
    expect(prisma.ingredientSubstitute.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ingredientId: 'p1' },
        orderBy: { score: 'desc' },
      }),
    );
    expect(result.map((r) => r.name)).toEqual(['白胡椒', '黑胡椒']);
    expect(result[0].score).toBe(95);
  });

  it('throws when ingredient missing', async () => {
    prisma.ingredient.findFirst.mockResolvedValue(null);
    await expect(
      service.listByIngredientName('不存在的料'),
    ).rejects.toMatchObject({
      code: ErrorCodes.NOT_FOUND_INGREDIENT,
    });
  });
});
