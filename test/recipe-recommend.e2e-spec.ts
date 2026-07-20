import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  IngredientCategory,
  MaterialType,
  RecipeSource,
  RecipeStatus,
} from '@prisma/client';
import { AppModule } from '../src/app.module';
import { ApiExceptionFilter } from '../src/common/api-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { passthroughGuard } from './passthrough.guard';

describe('POST /api/v1/recipe/recommend (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const cleanupIngredientIds: string[] = [];
  const cleanupRecipeIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue(passthroughGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    for (const id of cleanupRecipeIds) {
      await prisma.recipeMaterial.deleteMany({ where: { recipeId: id } });
      await prisma.recipe.deleteMany({ where: { id } });
    }
    if (cleanupIngredientIds.length) {
      await prisma.ingredient.deleteMany({
        where: { id: { in: cleanupIngredientIds } },
      });
    }
    await app.close();
  });

  it('returns 10002/10001 for empty ingredients (TR-REC-002)', async () => {
    const emptyArray = await request(app.getHttpServer())
      .post('/api/v1/recipe/recommend')
      .send({ ingredients: [] })
      .expect(400);
    expect([10001, 10002]).toContain(emptyArray.body.code);

    const whitespace = await request(app.getHttpServer())
      .post('/api/v1/recipe/recommend')
      .send({ ingredients: ['  ', ''] })
      .expect(400);
    expect(whitespace.body.code).toBe(10002);
  });

  it('recommends seeded recipe from DB (TR-REC-001 / TR-REC-003)', async () => {
    const suffix = Date.now();
    const chicken = await prisma.ingredient.create({
      data: {
        name: `推荐鸡肉_${suffix}`,
        category: IngredientCategory.MAIN,
      },
    });
    const potato = await prisma.ingredient.create({
      data: {
        name: `推荐土豆_${suffix}`,
        category: IngredientCategory.MAIN,
      },
    });
    const pepper = await prisma.ingredient.create({
      data: {
        name: `推荐胡椒粉_${suffix}`,
        category: IngredientCategory.SEASONING,
      },
    });
    cleanupIngredientIds.push(chicken.id, potato.id, pepper.id);

    const recipe = await prisma.recipe.create({
      data: {
        name: `推荐土豆炒鸡_${suffix}`,
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

    const full = await request(app.getHttpServer())
      .post('/api/v1/recipe/recommend')
      .send({
        ingredients: [potato.name, chicken.name, pepper.name],
      })
      .expect(200);

    expect(full.body.code).toBe(0);
    expect(full.body.data.source).toBe('database');
    expect(full.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(full.body.data.recipe).toBe(recipe.name);
    expect(full.body.data.score).toBe(100);
    expect(full.body.data.missing).toEqual([]);
    expect(full.body.data.items[0].steps.length).toBeGreaterThan(0);
    expect(full.body.data.items[0].ingredients.length).toBeGreaterThan(0);
    expect(full.body.data.queryHash).toMatch(/^[a-f0-9]{64}$/);

    const partial = await request(app.getHttpServer())
      .post('/api/v1/recipe/recommend')
      .send({ ingredients: [chicken.name, potato.name] })
      .expect(200);

    expect(partial.body.data.recipe).toBe(recipe.name);
    expect(partial.body.data.missing).toContain(pepper.name);
    expect(partial.body.data.score).toBeGreaterThan(0);
    expect(partial.body.data.score).toBeLessThan(100);
  });
});
