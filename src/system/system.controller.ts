import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';
import { AppError, ErrorCodes } from '../common/errors';

type SeedBody = {
  minimal?: boolean;
  ingredients?: number;
  recipes?: number;
  substitutes?: number;
};

@Controller('system')
export class SystemController {
  private running = false;
  private lastResult: Record<string, unknown> | null = null;
  private lastError: string | null = null;

  private assertSeedApiEnabled(): void {
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ENABLE_SEED_API !== '1'
    ) {
      throw new AppError(ErrorCodes.INVALID_PARAM, 'Not found', 404);
    }
  }

  @Post('seed')
  @HttpCode(200)
  async triggerSeed(
    @Headers('x-seed-token') token: string | undefined,
    @Body() body: SeedBody = {},
  ) {
    this.assertSeedApiEnabled();

    const secret = process.env.SEED_SECRET;
    if (!secret || token !== secret) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid seed token', 401);
    }

    if (this.running) {
      return {
        code: 0,
        message: 'ok',
        data: { status: 'already_running', lastResult: this.lastResult },
      };
    }

    const minimal = body.minimal !== false;
    this.running = true;
    this.lastError = null;

    void this.runSeedProcess({
      SEED_MINIMAL: minimal ? '1' : '0',
      SEED_INGREDIENTS: String(body.ingredients ?? (minimal ? 80 : 1000)),
      SEED_RECIPES: String(body.recipes ?? (minimal ? 40 : 5000)),
      SEED_SUBSTITUTES: String(body.substitutes ?? (minimal ? 40 : 5000)),
    }).finally(() => {
      this.running = false;
    });

    return {
      code: 0,
      message: 'ok',
      data: { status: 'started', minimal },
    };
  }

  @Get('seed/status')
  status(@Headers('x-seed-token') token: string | undefined) {
    this.assertSeedApiEnabled();

    const secret = process.env.SEED_SECRET;
    if (!secret || token !== secret) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid seed token', 401);
    }
    return {
      code: 0,
      message: 'ok',
      data: {
        running: this.running,
        lastResult: this.lastResult,
        lastError: this.lastError,
      },
    };
  }

  private runSeedProcess(env: Record<string, string>): Promise<void> {
    const seedJs = path.join(process.cwd(), 'dist', 'prisma', 'seed.js');
    return new Promise((resolve) => {
      const child = spawn(process.execPath, [seedJs], {
        env: { ...process.env, ...env },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let out = '';
      child.stdout?.on('data', (buf: Buffer) => {
        out += buf.toString();
      });
      child.stderr?.on('data', (buf: Buffer) => {
        out += buf.toString();
      });
      child.on('exit', (code) => {
        if (code === 0) {
          this.lastResult = { ok: true, at: new Date().toISOString() };
          this.lastError = null;
        } else {
          this.lastError = `seed exited ${code}: ${out.slice(-500)}`;
          this.lastResult = { ok: false };
        }
        resolve();
      });
      child.on('error', (err) => {
        this.lastError = String(err);
        this.lastResult = { ok: false };
        resolve();
      });
    });
  }
}
