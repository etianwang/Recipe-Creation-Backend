import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: { ping: jest.Mock };

  beforeEach(async () => {
    prisma = { ping: jest.fn().mockResolvedValue(false) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get(HealthController);
  });

  it('returns scaffold health payload without requiring DB', async () => {
    const result = await controller.check();
    expect(result).toEqual({
      code: 0,
      message: 'ok',
      data: {
        status: 'up',
        database: 'down',
      },
    });
    expect(prisma.ping).toHaveBeenCalled();
  });

  it('reports database up when ping succeeds', async () => {
    prisma.ping.mockResolvedValue(true);
    const result = await controller.check();
    expect(result.data.database).toBe('up');
  });
});
