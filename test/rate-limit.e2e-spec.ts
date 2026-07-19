process.env.API_RATE_TTL_MS = '60000';
process.env.API_RATE_LIMIT = '3';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ApiExceptionFilter } from '../src/common/api-exception.filter';
import { AiQuotaService } from '../src/ai/ai-quota.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { passthroughGuard } from './passthrough.guard';

describe('Rate limits (e2e)', () => {
  describe('API throttle 40001', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.setGlobalPrefix('api/v1');
      app.useGlobalFilters(new ApiExceptionFilter());
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns 40001 when API rate limit exceeded', async () => {
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(await request(app.getHttpServer()).get('/api/v1/health'));
      }
      const limited = results.find((r) => r.status === 429);
      expect(limited).toBeDefined();
      expect(limited!.body.code).toBe(40001);
    });
  });

  describe('AI quota 40002 (TR-AI-005)', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let aiQuota: AiQuotaService;
    const usernames: string[] = [];

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
      aiQuota = app.get(AiQuotaService);
      aiQuota.reset();
      aiQuota.setLimit(2);
    });

    afterAll(async () => {
      if (usernames.length) {
        await prisma.user.deleteMany({
          where: { username: { in: usernames } },
        });
      }
      await app.close();
    });

    it('returns 40002 when AI daily quota exceeded', async () => {
      const name = `quota_${Date.now()}`;
      usernames.push(name);
      const reg = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ username: name, password: 'secret12' })
        .expect(200);

      const token = reg.body.data.accessToken as string;
      const uniqueIngredient = `配额测食材_${Date.now()}`;

      const first = await request(app.getHttpServer())
        .post('/api/v1/ai/query')
        .set('Authorization', `Bearer ${token}`)
        .send({ ingredients: [uniqueIngredient] });
      expect(first.status).toBe(200);
      expect(first.body.code).toBe(0);
      expect(first.body.data.structured).toBe(true);
      expect(['ai', 'cache']).toContain(first.body.data.source);

      const second = await request(app.getHttpServer())
        .post('/api/v1/ai/query')
        .set('Authorization', `Bearer ${token}`)
        .send({ ingredients: [uniqueIngredient] });
      expect(second.status).toBe(200);

      // Force another AI consume by calling generate path via a second unique miss
      // QuotaGuard still consumes on every /ai/query regardless of cache.
      const third = await request(app.getHttpServer())
        .post('/api/v1/ai/query')
        .set('Authorization', `Bearer ${token}`)
        .send({ ingredients: [uniqueIngredient] });
      expect(third.status).toBe(429);
      expect(third.body.code).toBe(40002);
    });
  });
});
