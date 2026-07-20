import { Test, TestingModule } from '@nestjs/testing';
import { MaterialType, RecipeSource } from '@prisma/client';
import { RecipeRecommendService } from './recipe-recommend.service';
import { SearchService } from '../search/search.service';
import { AiRecipeService } from '../ai/ai-recipe.service';
import { RECOMMEND_DB_SCAN_LIMIT } from './recommend.types';
import { computeQueryHash } from '../search/query-hash';

describe('RecipeRecommendService', () => {
  let service: RecipeRecommendService;
  const searchService = {
    recommendFromDatabase: jest.fn(),
  };
  const aiRecipeService = {
    generateOrLoad: jest.fn(),
    loadFromCacheOnly: jest.fn(),
    ensurePersisted: jest.fn().mockResolvedValue(undefined),
    getParsedDetailsByRecipeIds: jest.fn().mockResolvedValue(new Map()),
  };

  const dbHit = (overrides: Record<string, unknown> = {}) => ({
    id: 'r1',
    name: '土豆炒鸡',
    score: 85,
    missing: [],
    recipeSource: RecipeSource.MANUAL,
    materials: [
      {
        required: true,
        type: MaterialType.MAIN,
        ingredient: { name: '鸡肉' },
      },
      {
        required: true,
        type: MaterialType.MAIN,
        ingredient: { name: '土豆' },
      },
    ],
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    aiRecipeService.loadFromCacheOnly.mockResolvedValue(null);
    aiRecipeService.ensurePersisted.mockResolvedValue(undefined);
    aiRecipeService.getParsedDetailsByRecipeIds.mockResolvedValue(new Map());
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipeRecommendService,
        { provide: SearchService, useValue: searchService },
        { provide: AiRecipeService, useValue: aiRecipeService },
      ],
    }).compile();
    service = module.get(RecipeRecommendService);
  });

  it('does not call AI when >=5 DB hits score above 30% (TR-REC-001)', async () => {
    searchService.recommendFromDatabase.mockResolvedValue({
      queryHash: 'hash',
      normalizedIngredients: ['鸡肉', '土豆'],
      items: Array.from({ length: 5 }, (_, i) =>
        dbHit({
          id: `r${i}`,
          name: `菜${i}`,
          score: 40 + i,
        }),
      ),
    });

    const result = await service.recommend(['鸡肉', '土豆']);

    expect(searchService.recommendFromDatabase).toHaveBeenCalledWith(
      ['鸡肉', '土豆'],
      RECOMMEND_DB_SCAN_LIMIT,
    );
    expect(result.source).toBe('database');
    expect(result.items).toHaveLength(5);
    expect(aiRecipeService.generateOrLoad).not.toHaveBeenCalled();
    expect(aiRecipeService.loadFromCacheOnly).not.toHaveBeenCalled();
  });

  it('calls live AI, re-reads DB, labels AI recipes (TR-REC-004)', async () => {
    searchService.recommendFromDatabase
      .mockResolvedValueOnce({
        queryHash: 'hash',
        normalizedIngredients: ['鸡肉', '土豆'],
        items: [dbHit()],
      })
      .mockResolvedValueOnce({
        queryHash: 'hash',
        normalizedIngredients: ['鸡肉', '土豆'],
        items: [
          dbHit(),
          dbHit({
            id: 'ai1',
            name: 'AI 炖鸡',
            score: 90,
            recipeSource: RecipeSource.AI,
            materials: [
              {
                required: true,
                type: MaterialType.MAIN,
                ingredient: { name: '鸡肉' },
              },
            ],
          }),
        ],
      });
    aiRecipeService.generateOrLoad.mockResolvedValue({
      queryHash: 'hash',
      normalizedIngredients: ['鸡肉', '土豆'],
      recipes: [
        {
          name: 'AI 炖鸡',
          confidence: 0.9,
          ingredients: [
            { name: '鸡肉', type: '主料', amount: '500g', required: true },
          ],
          steps: ['炖'],
          substitutes: [],
        },
      ],
      recipe: {},
      source: 'ai',
    });
    aiRecipeService.getParsedDetailsByRecipeIds.mockResolvedValue(
      new Map([
        [
          'ai1',
          {
            name: 'AI 炖鸡',
            confidence: 0.9,
            ingredients: [
              { name: '鸡肉', type: '主料', amount: '500g', required: true },
            ],
            steps: ['炖'],
            substitutes: [],
          },
        ],
      ]),
    );

    const result = await service.recommend(['鸡肉', '土豆']);

    expect(aiRecipeService.generateOrLoad).toHaveBeenCalledWith(['鸡肉', '土豆'], {
      recipeCount: 4,
    });
    expect(searchService.recommendFromDatabase).toHaveBeenCalledTimes(2);
    expect(result.items.some((i) => i.recipe === '土豆炒鸡')).toBe(true);
    expect(result.items.some((i) => i.recipe === 'AI 炖鸡')).toBe(true);
    const aiItem = result.items.find((i) => i.recipe === 'AI 炖鸡');
    expect(aiItem?.isAiSuggestion).toBe(true);
    expect(aiItem?.fromRecipeLibrary).toBe(true);
    expect(aiItem?.sourceLabel).toBe('AI推荐 · 来自菜谱库');
    expect(aiItem?.recipeId).toBe('ai1');
    expect(result.items.find((i) => i.recipe === '土豆炒鸡')?.isAiSuggestion).toBe(
      false,
    );
    expect(result.items.find((i) => i.recipe === '土豆炒鸡')?.fromRecipeLibrary).toBe(
      true,
    );
    expect(result.source).toBe('mixed');
  });

  it('calls live AI when database has no qualified hits', async () => {
    searchService.recommendFromDatabase
      .mockResolvedValueOnce({
        queryHash: 'hash',
        normalizedIngredients: ['洋葱', '豆腐'],
        items: [],
      })
      .mockResolvedValueOnce({
        queryHash: 'hash',
        normalizedIngredients: ['洋葱', '豆腐'],
        items: [
          dbHit({
            id: 'ai2',
            name: '洋葱炒豆腐',
            score: 90,
            recipeSource: RecipeSource.AI,
            materials: [
              {
                required: true,
                type: MaterialType.MAIN,
                ingredient: { name: '豆腐' },
              },
            ],
          }),
        ],
      });
    aiRecipeService.generateOrLoad.mockResolvedValue({
      queryHash: 'hash',
      normalizedIngredients: ['洋葱', '豆腐'],
      recipes: [
        {
          name: '洋葱炒豆腐',
          confidence: 0.9,
          ingredients: [
            { name: '豆腐', type: '主料', amount: '300g', required: true },
          ],
          steps: ['切块', '翻炒'],
          substitutes: [],
        },
      ],
      recipe: {},
      source: 'ai',
    });

    const result = await service.recommend(['洋葱', '豆腐']);

    expect(aiRecipeService.generateOrLoad).toHaveBeenCalledWith(['洋葱', '豆腐'], {
      recipeCount: 5,
    });
    expect(result.items[0].recipe).toBe('洋葱炒豆腐');
    expect(result.source).toBe('ai');
  });

  it('ignores DB hits at or below 30% when counting qualified hits', async () => {
    searchService.recommendFromDatabase
      .mockResolvedValueOnce({
        queryHash: 'hash',
        normalizedIngredients: ['土豆', '茄子', '胡萝卜'],
        items: [
          dbHit({
            id: 'low',
            name: '低分菜',
            score: 30,
            materials: [
              {
                required: true,
                type: MaterialType.MAIN,
                ingredient: { name: '土豆' },
              },
            ],
          }),
        ],
      })
      .mockResolvedValueOnce({
        queryHash: 'hash',
        normalizedIngredients: ['土豆', '茄子', '胡萝卜'],
        items: [
          dbHit({
            id: 'ai3',
            name: '地三鲜',
            score: 92,
            recipeSource: RecipeSource.AI,
            materials: [
              {
                required: true,
                type: MaterialType.MAIN,
                ingredient: { name: '土豆' },
              },
            ],
          }),
        ],
      });
    aiRecipeService.generateOrLoad.mockResolvedValue({
      queryHash: 'hash',
      normalizedIngredients: ['土豆', '茄子', '胡萝卜'],
      recipes: [
        {
          name: '地三鲜',
          confidence: 0.92,
          ingredients: [
            { name: '土豆', type: '主料', amount: '300g', required: true },
          ],
          steps: ['炒'],
          substitutes: [],
        },
      ],
      recipe: {},
      source: 'ai',
    });

    const result = await service.recommend(['土豆', '茄子', '胡萝卜']);

    expect(result.items.every((i) => i.recipe !== '低分菜')).toBe(true);
    expect(aiRecipeService.generateOrLoad).toHaveBeenCalled();
  });

  it('merges cache supplements after persist and DB refresh', async () => {
    searchService.recommendFromDatabase
      .mockResolvedValueOnce({
        queryHash: 'hash',
        normalizedIngredients: ['土豆', '排骨'],
        items: [
          dbHit({
            id: 'r1',
            name: '土豆炖排骨',
            score: 80,
            missing: ['姜'],
          }),
        ],
      })
      .mockResolvedValueOnce({
        queryHash: 'hash',
        normalizedIngredients: ['土豆', '排骨'],
        items: [
          dbHit({ id: 'r1', name: '土豆炖排骨', score: 80, missing: ['姜'] }),
          dbHit({
            id: 'c1',
            name: '香煎排骨',
            score: 88,
            recipeSource: RecipeSource.AI,
          }),
          dbHit({
            id: 'c2',
            name: '红烧排骨',
            score: 86,
            recipeSource: RecipeSource.AI,
          }),
          dbHit({
            id: 'c3',
            name: '土豆泥',
            score: 84,
            recipeSource: RecipeSource.AI,
          }),
          dbHit({
            id: 'c4',
            name: '排骨煲',
            score: 82,
            recipeSource: RecipeSource.AI,
          }),
        ],
      });
    aiRecipeService.loadFromCacheOnly.mockResolvedValue({
      queryHash: 'hash',
      normalizedIngredients: ['土豆', '排骨'],
      recipes: [
        {
          name: '香煎排骨',
          confidence: 0.88,
          ingredients: [
            { name: '排骨', type: '主料', amount: '500g', required: true },
          ],
          steps: ['煎'],
          substitutes: [],
        },
        {
          name: '红烧排骨',
          confidence: 0.86,
          ingredients: [
            { name: '排骨', type: '主料', amount: '500g', required: true },
          ],
          steps: ['烧'],
          substitutes: [],
        },
        {
          name: '土豆泥',
          confidence: 0.84,
          ingredients: [
            { name: '土豆', type: '主料', amount: '300g', required: true },
          ],
          steps: ['蒸'],
          substitutes: [],
        },
        {
          name: '排骨煲',
          confidence: 0.82,
          ingredients: [
            { name: '排骨', type: '主料', amount: '500g', required: true },
          ],
          steps: ['煲'],
          substitutes: [],
        },
      ],
      recipe: {},
      source: 'cache',
    });

    const result = await service.recommend(['土豆', '排骨']);

    expect(aiRecipeService.ensurePersisted).toHaveBeenCalled();
    expect(aiRecipeService.generateOrLoad).not.toHaveBeenCalled();
    expect(result.items.length).toBe(5);
    expect(result.source).toBe('mixed');
  });

  it('returns partial DB when live AI fails', async () => {
    searchService.recommendFromDatabase.mockResolvedValue({
      queryHash: 'hash',
      normalizedIngredients: ['洋葱', '豆腐'],
      items: [],
    });
    aiRecipeService.generateOrLoad.mockRejectedValue(
      new Error('AI provider timeout'),
    );

    const result = await service.recommend(['洋葱', '豆腐']);

    expect(result.items).toEqual([]);
    expect(result.source).toBe('database');
  });

  it('schedules background live AI when asyncLiveAi is true', async () => {
    searchService.recommendFromDatabase.mockResolvedValue({
      queryHash: 'hash',
      normalizedIngredients: ['土豆', '排骨', '番茄', '红薯'],
      items: [],
    });
    aiRecipeService.loadFromCacheOnly.mockResolvedValue(null);
    aiRecipeService.generateOrLoad.mockResolvedValue({
      queryHash: 'hash',
      normalizedIngredients: ['土豆', '排骨', '番茄', '红薯'],
      recipes: [],
      recipe: { name: 'test' },
      source: 'ai',
    });

    const result = await service.recommend(
      ['土豆', '排骨', '番茄', '红薯'],
      { asyncLiveAi: true },
    );

    await Promise.resolve();
    expect(aiRecipeService.generateOrLoad).toHaveBeenCalledWith(
      ['土豆', '排骨', '番茄', '红薯'],
      expect.objectContaining({ recipeCount: 2 }),
    );
    expect(result.aiPending).toBe(true);
    expect(result.items).toEqual([]);
  });

  it('does not call live AI again when cache exists (TR-REC-004 二次)', async () => {
    searchService.recommendFromDatabase.mockResolvedValue({
      queryHash: 'hash',
      normalizedIngredients: ['土豆'],
      items: [dbHit({ id: 'r1', score: 80 })],
    });
    aiRecipeService.loadFromCacheOnly.mockResolvedValue({
      queryHash: 'hash',
      normalizedIngredients: ['土豆'],
      recipes: [
        {
          name: '缓存菜',
          confidence: 0.9,
          ingredients: [
            { name: '土豆', type: '主料', amount: '200g', required: true },
          ],
          steps: ['炒'],
          substitutes: [],
        },
      ],
      recipe: { name: '缓存菜' },
      source: 'cache',
    });

    await service.recommend(['土豆'], { asyncLiveAi: true });
    await Promise.resolve();

    expect(aiRecipeService.ensurePersisted).toHaveBeenCalled();
    expect(aiRecipeService.generateOrLoad).not.toHaveBeenCalled();
  });

  it('poll reports pending while background AI is running', async () => {
    const names = ['土豆'];
    const queryHash = computeQueryHash(names);
    searchService.recommendFromDatabase.mockResolvedValue({
      queryHash,
      normalizedIngredients: names,
      items: [],
    });
    aiRecipeService.loadFromCacheOnly.mockResolvedValue(null);
    aiRecipeService.generateOrLoad.mockReturnValue(new Promise(() => {}));

    await service.recommend(names, { asyncLiveAi: true });
    const poll = await service.pollRecommend(names);

    expect(poll.aiPending).toBe(true);
  });

  it('skips live AI when skipLiveAi is true', async () => {
    searchService.recommendFromDatabase.mockResolvedValue({
      queryHash: 'hash',
      normalizedIngredients: ['土豆', '排骨', '番茄', '红薯'],
      items: [],
    });
    aiRecipeService.loadFromCacheOnly.mockResolvedValue(null);

    const result = await service.recommend(
      ['土豆', '排骨', '番茄', '红薯'],
      { skipLiveAi: true },
    );

    expect(aiRecipeService.loadFromCacheOnly).toHaveBeenCalled();
    expect(aiRecipeService.generateOrLoad).not.toHaveBeenCalled();
    expect(result.items).toEqual([]);
    expect(result.aiPending).toBe(false);
  });
});
