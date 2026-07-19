import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ApiExceptionFilter } from '../src/common/api-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppError, ErrorCodes } from '../src/common/errors';
import { WechatSessionClient } from '../src/auth/wechat-session.client';
import { passthroughGuard } from './passthrough.guard';

class MockWechatSessionClient extends WechatSessionClient {
  failNext = false;
  async code2Session(code: string) {
    if (this.failNext || code === 'bad') {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'invalid code', 401);
    }
    return { openid: `openid_${code}` };
  }
}

describe('WeChat openid login (e2e) TR-SEC-003/004', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const mock = new MockWechatSessionClient();
  const openids: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue(passthroughGuard)
      .overrideProvider(WechatSessionClient)
      .useValue(mock)
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
    if (openids.length) {
      await prisma.user.deleteMany({ where: { openid: { in: openids } } });
    }
    await app.close();
  });

  it('TR-SEC-003 code → JWT and upserts by openid', async () => {
    mock.failNext = false;
    const code = `c_${Date.now()}`;
    const openid = `openid_${code}`;
    openids.push(openid);

    const first = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat/login')
      .send({ code })
      .expect(200);

    expect(first.body.code).toBe(0);
    expect(first.body.data.accessToken).toBeTruthy();
    expect(first.body.data.user.openid).toBe(openid);
    expect(first.body.data.user.role).toBe('USER');

    const second = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat/login')
      .send({ code })
      .expect(200);

    expect(second.body.data.user.id).toBe(first.body.data.user.id);

    const users = await prisma.user.findMany({ where: { openid } });
    expect(users).toHaveLength(1);
  });

  it('TR-SEC-004 invalid code does not issue token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat/login')
      .send({ code: 'bad' })
      .expect(401);

    expect(res.body.code).toBe(20001);
    expect(res.body.data?.accessToken).toBeFalsy();
  });
});
