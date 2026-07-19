import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { IngredientCategory, KnowledgeSource } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { ApiExceptionFilter } from '../src/common/api-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { passthroughGuard } from './passthrough.guard';

describe('Substitutes API (e2e) TR-SUB-001', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const cleanupIds: string[] = [];

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
    await prisma.ingredientSubstitute.deleteMany({
      where: {
        OR: [
          { ingredientId: { in: cleanupIds } },
          { substituteId: { in: cleanupIds } },
        ],
      },
    });
    if (cleanupIds.length) {
      await prisma.ingredient.deleteMany({
        where: { id: { in: cleanupIds } },
      });
    }
    await app.close();
  });

  it('returns substitutes by id and by name sorted by score', async () => {
    const suffix = Date.now();
    const pepper = await prisma.ingredient.create({
      data: {
        name: `替代胡椒粉_${suffix}`,
        category: IngredientCategory.SEASONING,
      },
    });
    const white = await prisma.ingredient.create({
      data: {
        name: `替代白胡椒_${suffix}`,
        category: IngredientCategory.SEASONING,
      },
    });
    const black = await prisma.ingredient.create({
      data: {
        name: `替代黑胡椒_${suffix}`,
        category: IngredientCategory.SPICE,
      },
    });
    const prickly = await prisma.ingredient.create({
      data: {
        name: `替代花椒_${suffix}`,
        category: IngredientCategory.SPICE,
      },
    });
    cleanupIds.push(pepper.id, white.id, black.id, prickly.id);

    await prisma.ingredientSubstitute.createMany({
      data: [
        {
          ingredientId: pepper.id,
          substituteId: white.id,
          score: 95,
          source: KnowledgeSource.MANUAL,
        },
        {
          ingredientId: pepper.id,
          substituteId: black.id,
          score: 80,
          source: KnowledgeSource.MANUAL,
        },
        {
          ingredientId: pepper.id,
          substituteId: prickly.id,
          score: 60,
          source: KnowledgeSource.MANUAL,
        },
      ],
    });

    const byId = await request(app.getHttpServer())
      .get(`/api/v1/ingredients/${pepper.id}/substitutes`)
      .expect(200);

    expect(byId.body.code).toBe(0);
    expect(byId.body.data.map((x: { name: string }) => x.name)).toEqual([
      white.name,
      black.name,
      prickly.name,
    ]);
    expect(byId.body.data[0].score).toBe(95);

    const byName = await request(app.getHttpServer())
      .post('/api/v1/ingredients/substitutes')
      .send({ ingredient: pepper.name })
      .expect(200);

    expect(byName.body.data).toHaveLength(3);
    expect(byName.body.data[0].name).toBe(white.name);
  });
});
