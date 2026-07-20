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
      findMany: jest.fn(),
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
    expect(result.map((r) => r.name)).toEqual(['白胡椒', '黑胡椒']);
    expect(result[0].score).toBe(95);
    expect(result[0].source).toBe('manual');
    expect(result[0].sourceLabel).toBe('菜谱库');
  });

  it('resolves alias 葱 to 大葱 and returns substitutes', async () => {
    prisma.ingredient.findFirst.mockResolvedValue({
      id: 'scallion',
      name: '大葱',
    });
    prisma.ingredientSubstitute.findMany.mockResolvedValue([
      {
        score: 50,
        source: KnowledgeSource.MANUAL,
        substitute: { id: 'onion', name: '洋葱' },
      },
    ]);

    const result = await service.listByIngredientName('葱');

    expect(prisma.ingredient.findFirst).toHaveBeenCalledWith({
      where: { name: '大葱' },
    });
    expect(result.resolvedFrom).toBe('葱');
    expect(result.ingredient.name).toBe('大葱');
    expect(result.items[0].name).toBe('洋葱');
  });

  it('throws Chinese message when ingredient missing', async () => {
    prisma.ingredient.findFirst.mockResolvedValue(null);
    prisma.ingredient.findMany.mockResolvedValue([]);

    await expect(service.listByIngredientName('不存在的料')).rejects.toMatchObject({
      code: ErrorCodes.NOT_FOUND_INGREDIENT,
      message: expect.stringContaining('食材库中暂无'),
    });
  });
});
