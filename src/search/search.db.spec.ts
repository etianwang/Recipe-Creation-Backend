import {
  IngredientCategory,
  MaterialType,
  PrismaClient,
  RecipeSource,
  RecipeStatus,
} from '@prisma/client';
import { SearchService } from './search.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Integration against real Docker Postgres when reachable.
 * TR-REC-001 / TR-REC-003 style.
 */
describe('SearchService DB integration', () => {
  const prisma = new PrismaClient() as unknown as PrismaService;
  let service: SearchService;
  let reachable = false;
  const cleanupIngredientIds: string[] = [];
  const cleanupRecipeIds: string[] = [];

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      reachable = true;
      service = new SearchService(prisma);
    } catch {
      reachable = false;
    }
  });

  afterAll(async () => {
    if (reachable) {
      for (const id of cleanupRecipeIds) {
        await prisma.recipeMaterial.deleteMany({ where: { recipeId: id } });
        await prisma.recipe.deleteMany({ where: { id } });
      }
      if (cleanupIngredientIds.length) {
        await prisma.ingredient.deleteMany({
          where: { id: { in: cleanupIngredientIds } },
        });
      }
    }
    await prisma.$disconnect();
  });

  it('recommends seeded recipe from real DB', async () => {
    if (!reachable) {
      console.warn('Skip: DB unreachable');
      return;
    }

    const suffix = Date.now();
    const chicken = await prisma.ingredient.create({
      data: {
        name: `集成鸡肉_${suffix}`,
        category: IngredientCategory.MAIN,
      },
    });
    const potato = await prisma.ingredient.create({
      data: {
        name: `集成土豆_${suffix}`,
        category: IngredientCategory.MAIN,
      },
    });
    const pepper = await prisma.ingredient.create({
      data: {
        name: `集成胡椒粉_${suffix}`,
        category: IngredientCategory.SEASONING,
      },
    });
    cleanupIngredientIds.push(chicken.id, potato.id, pepper.id);

    const recipe = await prisma.recipe.create({
      data: {
        name: `集成土豆炒鸡_${suffix}`,
        source: RecipeSource.MANUAL,
        status: RecipeStatus.PUBLISHED,
        materials: {
          create: [
            {
              ingredientId: chicken.id,
              type: MaterialType.MAIN,
              required: true,
            },
            {
              ingredientId: potato.id,
              type: MaterialType.MAIN,
              required: true,
            },
            {
              ingredientId: pepper.id,
              type: MaterialType.SEASONING,
              required: true,
            },
          ],
        },
      },
    });
    cleanupRecipeIds.push(recipe.id);

    const hit = await service.recommendFromDatabase([
      chicken.name,
      potato.name,
      pepper.name,
    ]);
    expect(hit.source).toBe('database');
    expect(hit.recipe?.name).toBe(recipe.name);
    expect(hit.score).toBe(100);
    expect(hit.missing).toEqual([]);

    const partial = await service.recommendFromDatabase([
      chicken.name,
      potato.name,
    ]);
    expect(partial.recipe?.name).toBe(recipe.name);
    expect(partial.missing).toContain(pepper.name);
    expect(partial.score).toBeGreaterThan(0);
    expect(partial.score).toBeLessThan(100);
  });
});
