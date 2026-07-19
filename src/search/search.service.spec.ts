import { Test, TestingModule } from '@nestjs/testing';
import {
  IngredientCategory,
  MaterialType,
  RecipeSource,
  RecipeStatus,
} from '@prisma/client';
import { SearchService } from './search.service';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorCodes } from '../common/errors';

describe('SearchService', () => {
  let service: SearchService;
  const prisma = {
    recipe: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(SearchService);
  });

  it('rejects empty ingredients (TR-REC-002)', async () => {
    await expect(service.recommendFromDatabase([])).rejects.toMatchObject({
      code: ErrorCodes.EMPTY_INGREDIENTS,
    });
    await expect(service.recommendFromDatabase(['  '])).rejects.toMatchObject({
      code: ErrorCodes.EMPTY_INGREDIENTS,
    });
  });

  it('scores recipe and lists missing required (TR-REC-003)', async () => {
    prisma.recipe.findMany.mockResolvedValue([
      {
        id: 'r1',
        name: '土豆青椒炒鸡',
        status: RecipeStatus.PUBLISHED,
        source: RecipeSource.MANUAL,
        materials: [
          {
            required: true,
            type: MaterialType.MAIN,
            ingredient: {
              id: 'i1',
              name: '鸡肉',
              category: IngredientCategory.MAIN,
            },
          },
          {
            required: true,
            type: MaterialType.MAIN,
            ingredient: {
              id: 'i2',
              name: '土豆',
              category: IngredientCategory.MAIN,
            },
          },
          {
            required: true,
            type: MaterialType.SEASONING,
            ingredient: {
              id: 'i3',
              name: '胡椒粉',
              category: IngredientCategory.SEASONING,
            },
          },
        ],
      },
    ]);

    const result = await service.recommendFromDatabase(['鸡肉', '土豆']);
    expect(result.source).toBe('database');
    expect(result.recipe?.name).toBe('土豆青椒炒鸡');
    expect(result.missing).toContain('胡椒粉');
    expect(result.score).toBeCloseTo(66.67, 1);
    expect(result.queryHash).toBeTruthy();
  });

  it('returns database hit when all required present (TR-REC-001)', async () => {
    prisma.recipe.findMany.mockResolvedValue([
      {
        id: 'r1',
        name: '土豆炒鸡',
        status: RecipeStatus.PUBLISHED,
        source: RecipeSource.MANUAL,
        materials: [
          {
            required: true,
            type: MaterialType.MAIN,
            ingredient: { id: 'i1', name: '鸡肉', category: IngredientCategory.MAIN },
          },
          {
            required: true,
            type: MaterialType.MAIN,
            ingredient: { id: 'i2', name: '土豆', category: IngredientCategory.MAIN },
          },
        ],
      },
    ]);

    const result = await service.recommendFromDatabase(['土豆', '鸡肉']);
    expect(result.recipe?.name).toBe('土豆炒鸡');
    expect(result.score).toBe(100);
    expect(result.missing).toEqual([]);
    expect(result.source).toBe('database');
  });
});
