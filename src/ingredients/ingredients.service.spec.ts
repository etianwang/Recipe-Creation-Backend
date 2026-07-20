import { Test, TestingModule } from '@nestjs/testing';
import { IngredientCategory, ReviewKind, ReviewStatus } from '@prisma/client';
import { IngredientsService } from './ingredients.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppError, ErrorCodes } from '../common/errors';

describe('IngredientsService', () => {
  let service: IngredientsService;
  const prisma = {
    ingredient: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    knowledgeReview: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngredientsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(IngredientsService);
  });

  it('searches by name contains', async () => {
    prisma.ingredient.findMany.mockResolvedValue([
      {
        id: '1',
        name: '鸡肉',
        category: IngredientCategory.MAIN,
        taste: null,
        description: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);

    const result = await service.search('鸡', '主料');
    expect(prisma.ingredient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          name: { contains: '鸡' },
          category: IngredientCategory.MAIN,
        },
      }),
    );
    expect(result[0]).toMatchObject({
      name: '鸡肉',
      categoryLabel: '主料',
    });
  });

  it('rejects invalid category', async () => {
    await expect(service.search(undefined, '坏分类')).rejects.toMatchObject({
      code: ErrorCodes.INVALID_PARAM,
    } as AppError);
  });

  it('throws NOT_FOUND when missing', async () => {
    prisma.ingredient.findUnique.mockResolvedValue(null);
    await expect(service.findById('missing')).rejects.toMatchObject({
      code: ErrorCodes.NOT_FOUND_INGREDIENT,
    });
  });

  it('creates ingredient', async () => {
    prisma.ingredient.create.mockResolvedValue({
      id: '1',
      name: '土豆',
      category: IngredientCategory.MAIN,
      taste: null,
      description: null,
      source: 'MANUAL',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const created = await service.create({
      name: ' 土豆 ',
      category: IngredientCategory.MAIN,
    });
    expect(created.name).toBe('土豆');
    expect(created.source).toBe('MANUAL');
    expect(prisma.ingredient.create).toHaveBeenCalledWith({
      data: {
        name: '土豆',
        category: IngredientCategory.MAIN,
        taste: null,
        description: null,
        source: 'MANUAL',
      },
    });
  });

  it('submits ingredient as pending review (TR-GOV-002)', async () => {
    prisma.ingredient.findUnique.mockResolvedValue(null);
    prisma.knowledgeReview.findMany.mockResolvedValue([]);
    prisma.knowledgeReview.create.mockResolvedValue({
      id: 'rev1',
      status: ReviewStatus.PENDING,
    });

    const result = await service.submitForReview(
      { name: ' 西兰花 ', category: IngredientCategory.SIDE },
      'user1',
    );

    expect(result).toMatchObject({
      reviewId: 'rev1',
      status: 'PENDING',
      name: '西兰花',
    });
    expect(prisma.knowledgeReview.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kind: ReviewKind.INGREDIENT,
        status: ReviewStatus.PENDING,
      }),
    });
  });
});
