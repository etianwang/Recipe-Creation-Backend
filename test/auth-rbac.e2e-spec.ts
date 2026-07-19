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

describe('Auth & RBAC (e2e) TR-SEC-001', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const usernames: string[] = [];
  let reviewId = '';

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

    const review = await prisma.knowledgeReview.create({
      data: {
        kind: ReviewKind.RECIPE,
        payload: {
          queryHash: 'rbac-test',
          recipe: {
            name: `RBAC审核菜_${Date.now()}`,
            ingredients: [
              { name: '鸡蛋', type: '主料', required: true },
              { name: '盐', type: '调料', required: true },
            ],
            steps: ['炒'],
            substitutes: [],
            confidence: 0.7,
          },
        },
        status: ReviewStatus.PENDING,
      },
    });
    reviewId = review.id;
  });

  afterAll(async () => {
    if (reviewId) {
      await prisma.knowledgeReview.deleteMany({ where: { id: reviewId } });
    }
    if (usernames.length) {
      await prisma.user.deleteMany({
        where: { username: { in: usernames } },
      });
    }
    await app.close();
  });

  it('USER cannot approve review (20002)', async () => {
    const suffix = Date.now();
    const userName = `user_${suffix}`;
    usernames.push(userName);

    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ username: userName, password: 'secret12' })
      .expect(200);
    expect(reg.body.data.user.role).toBe(UserRole.USER);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/admin/knowledge-reviews/${reviewId}/approve`)
      .set('Authorization', `Bearer ${reg.body.data.accessToken}`)
      .expect(403);
    expect(res.body.code).toBe(20002);
  });

  it('ADMIN can approve pending review', async () => {
    const suffix = Date.now();
    const adminName = `admin_${suffix}`;
    usernames.push(adminName);

    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        username: adminName,
        password: 'secret12',
        role: UserRole.ADMIN,
      })
      .expect(200);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/admin/knowledge-reviews/${reviewId}/approve`)
      .set('Authorization', `Bearer ${reg.body.data.accessToken}`)
      .expect(200);

    expect(res.body.code).toBe(0);
    expect(res.body.data.status).toBe(ReviewStatus.APPROVED);
  });

  it('missing token → 20001', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/admin/knowledge-reviews/${reviewId}/approve`)
      .expect(401);
    expect(res.body.code).toBe(20001);
  });
});
