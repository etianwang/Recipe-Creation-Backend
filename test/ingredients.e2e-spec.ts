import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { IngredientCategory } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { ApiExceptionFilter } from '../src/common/api-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { passthroughGuard } from './passthrough.guard';

describe('Ingredients API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const createdIds: string[] = [];

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
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      // DB required for this suite
    }
  });

  afterAll(async () => {
    if (createdIds.length) {
      await prisma.ingredient.deleteMany({
        where: { id: { in: createdIds } },
      });
    }
    await app.close();
  });

  it('POST /ingredients creates then GET search finds it', async () => {
    const suffix = Date.now();
    const name = `测试鸡肉_${suffix}`;

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/ingredients')
      .send({
        name,
        category: IngredientCategory.MAIN,
        description: 'e2e',
      })
      .expect(201);

    // Nest default POST may be 201; if 200 also ok — check body
    expect(createRes.body.code).toBe(0);
    expect(createRes.body.data.name).toBe(name);
    createdIds.push(createRes.body.data.id);

    const searchRes = await request(app.getHttpServer())
      .get('/api/v1/ingredients')
      .query({ q: `测试鸡肉_${suffix}`, category: '主料' })
      .expect(200);

    expect(searchRes.body.code).toBe(0);
    expect(
      searchRes.body.data.some(
        (item: { name: string }) => item.name === name,
      ),
    ).toBe(true);

    await request(app.getHttpServer())
      .get(`/api/v1/ingredients/${createRes.body.data.id}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.data.categoryLabel).toBe('主料');
      });
  });

  it('GET unknown id returns 30001', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ingredients/00000000-0000-4000-8000-000000000099')
      .expect(404);
    expect(res.body.code).toBe(30001);
  });

  it('POST invalid body returns 10001', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ingredients')
      .send({ name: '' })
      .expect(400);
    expect(res.body.code).toBe(10001);
  });
});
