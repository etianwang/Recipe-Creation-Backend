import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { ReviewKind, ReviewStatus, UserRole } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { ApiExceptionFilter } from '../src/common/api-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { passthroughGuard } from './passthrough.guard';

describe('Knowledge review approve materialize (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const cleanupRecipeIds: string[] = [];
  let reviewId = '';
  let adminToken = '';
  let tomato = '';
  let egg = '';

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

    const adminName = `approve_admin_${Date.now()}`;
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        username: adminName,
        password: 'secret12',
        role: UserRole.ADMIN,
      })
      .expect(200);
    adminToken = reg.body.data.accessToken;

    const suffix = Date.now();
    tomato = `审核番茄_${suffix}`;
    egg = `审核鸡蛋_${suffix}`;
    const recipeName = `审核入库番茄鸡蛋_${suffix}`;

    const review = await prisma.knowledgeReview.create({
      data: {
        kind: ReviewKind.RECIPE,
        status: ReviewStatus.PENDING,
        payload: {
          queryHash: `approve-${suffix}`,
          recipe: {
            name: recipeName,
            ingredients: [
              { name: tomato, type: '主料', required: true },
              { name: egg, type: '主料', required: true },
              { name: '盐', type: '调料', required: true },
            ],
            steps: ['炒蛋', '下番茄'],
            substitutes: [],
            confidence: 0.88,
          },
        },
      },
    });
    reviewId = review.id;
  });

  afterAll(async () => {
    for (const id of cleanupRecipeIds) {
      await prisma.recipeMaterial.deleteMany({ where: { recipeId: id } });
      await prisma.recipe.deleteMany({ where: { id } });
    }
    if (reviewId) {
      await prisma.knowledgeReview.deleteMany({ where: { id: reviewId } });
    }
    await app.close();
  });

  it('approves and materializes recipe into published recipes', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/admin/knowledge-reviews/${reviewId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.code).toBe(0);
    expect(res.body.data.status).toBe(ReviewStatus.APPROVED);
    expect(res.body.data.recipeId).toBeTruthy();
    cleanupRecipeIds.push(res.body.data.recipeId);

    const recipe = await prisma.recipe.findUnique({
      where: { id: res.body.data.recipeId },
      include: { materials: true },
    });
    expect(recipe?.source).toBe('AI');
    expect(recipe?.status).toBe('PUBLISHED');
    expect(recipe?.materials.length).toBeGreaterThanOrEqual(2);

    const recommend = await request(app.getHttpServer())
      .post('/api/v1/recipe/recommend')
      .send({ ingredients: [tomato, egg, '盐'] })
      .expect(200);
    expect(recommend.body.data.source).toBe('database');
    expect(recommend.body.data.recipeId).toBe(res.body.data.recipeId);
  });
});
