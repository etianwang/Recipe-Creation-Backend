import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ApiExceptionFilter } from '../src/common/api-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { passthroughGuard } from './passthrough.guard';

describe('AI recommend fallback (e2e) TR-AI-001/002', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let queryHash = '';

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
    if (queryHash) {
      await prisma.aiGeneratedRecipe.deleteMany({ where: { queryHash } });
      await prisma.aiQueryLog.deleteMany({ where: { queryHash } });
      await prisma.aiQueryCache.deleteMany({ where: { queryHash } });
      await prisma.$executeRaw`
        DELETE FROM knowledge_review
        WHERE JSON_UNQUOTE(JSON_EXTRACT(payload, '$.queryHash')) = ${queryHash}
      `;
    }
    await app.close();
  });

  it('falls back to AI then serves cache without second AI path', async () => {
    const ingredients = ['异域香料B', '异域香料A'];

    const first = await request(app.getHttpServer())
      .post('/api/v1/recipe/recommend')
      .send({ ingredients })
      .expect(200);

    expect(first.body.data.source).toBe('ai');
    expect(first.body.data.recipe).toBeTruthy();
    expect(first.body.data.queryHash).toMatch(/^[a-f0-9]{64}$/);
    queryHash = first.body.data.queryHash;

    const cache = await prisma.aiQueryCache.findUnique({
      where: { queryHash },
    });
    expect(cache).toBeTruthy();

    const second = await request(app.getHttpServer())
      .post('/api/v1/recipe/recommend')
      .send({ ingredients: ['异域香料A', '异域香料B'] })
      .expect(200);

    expect(second.body.data.source).toBe('cache');
    expect(second.body.data.queryHash).toBe(queryHash);
  });
});
