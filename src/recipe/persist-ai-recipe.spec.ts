import {
  IngredientCategory,
  KnowledgeSource,
  MaterialType,
  RecipeSource,
} from '@prisma/client';
import {
  ensureAiIngredientsAndSubstitutes,
  isAiMaterialRequired,
  persistOneAiRecipe,
} from './persist-ai-recipe';
import type { ParsedRecipe } from '../ai/parse/parse-recipe-json';

describe('isAiMaterialRequired', () => {
  it('marks 主料 as required', () => {
    expect(isAiMaterialRequired({ type: '主料', required: false })).toBe(true);
  });

  it('marks 调料/香料/饮品 as optional', () => {
    expect(isAiMaterialRequired({ type: '调料', required: true })).toBe(false);
    expect(isAiMaterialRequired({ type: '香料', required: true })).toBe(false);
    expect(isAiMaterialRequired({ type: '饮品', required: true })).toBe(false);
  });

  it('follows AI required for 辅料', () => {
    expect(isAiMaterialRequired({ type: '辅料', required: true })).toBe(true);
    expect(isAiMaterialRequired({ type: '辅料', required: false })).toBe(false);
  });
});

describe('persistOneAiRecipe existing name still ensures ingredients (TR-AI-006)', () => {
  const recipe: ParsedRecipe = {
    name: '照烧鸡腿',
    confidence: 0.9,
    ingredients: [
      { name: '鸡腿', type: '主料', amount: '2个', required: true },
      { name: '味醂', type: '调料', amount: '1勺', required: false },
    ],
    steps: ['腌制', '煎熟', '上色'],
    substitutes: [],
  };

  it('creates missing ingredients and links materials when recipe already exists', async () => {
    const createdIngredients = new Map<string, { id: string; name: string }>();
    const materials: unknown[] = [];

    const tx = {
      ingredient: {
        findUnique: jest.fn(async ({ where }: { where: { name: string } }) => {
          return createdIngredients.get(where.name) ?? null;
        }),
        create: jest.fn(
          async ({
            data,
          }: {
            data: { name: string; category: IngredientCategory; source: KnowledgeSource };
          }) => {
            const row = { id: `id-${data.name}`, name: data.name, ...data };
            createdIngredients.set(data.name, row);
            return row;
          },
        ),
      },
      recipe: {
        findFirst: jest.fn(async () => ({
          id: 'existing-recipe',
          name: '照烧鸡腿',
          source: RecipeSource.AI,
        })),
        create: jest.fn(),
      },
      recipeMaterial: {
        upsert: jest.fn(async (args: unknown) => {
          materials.push(args);
          return args;
        }),
      },
      ingredientSubstitute: { upsert: jest.fn() },
      aiGeneratedRecipe: {
        findFirst: jest.fn(async () => ({ id: 'link1' })),
        create: jest.fn(),
      },
    };

    const id = await persistOneAiRecipe(tx as never, recipe, 'hash1', []);

    expect(id).toBe('existing-recipe');
    expect(tx.recipe.create).not.toHaveBeenCalled();
    expect(createdIngredients.has('味醂')).toBe(true);
    expect(materials.length).toBe(2);
    expect(tx.recipeMaterial.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          ingredientId: 'id-味醂',
          type: MaterialType.SEASONING,
        }),
      }),
    );
  });
});

describe('ensureAiIngredientsAndSubstitutes', () => {
  it('ensures seasoning category for 调料', async () => {
    const created: string[] = [];
    const tx = {
      ingredient: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async ({ data }: { data: { name: string } }) => {
          created.push(data.name);
          return { id: `id-${data.name}`, name: data.name };
        }),
      },
      ingredientSubstitute: { upsert: jest.fn() },
    };

    await ensureAiIngredientsAndSubstitutes(tx as never, {
      name: 'x',
      confidence: 1,
      ingredients: [{ name: '味醂', type: '调料', amount: '1', required: false }],
      steps: ['a', 'b', 'c'],
      substitutes: [],
    });

    expect(created).toContain('味醂');
    expect(tx.ingredient.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: '味醂',
        category: IngredientCategory.SEASONING,
        source: KnowledgeSource.AI,
      }),
    });
  });
});
