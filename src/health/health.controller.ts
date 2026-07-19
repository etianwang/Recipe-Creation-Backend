import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const database = await this.prisma.ping();
    return {
      code: 0,
      message: 'ok',
      data: {
        status: 'up',
        database: database ? 'up' : 'down',
      },
    };
  }
}
