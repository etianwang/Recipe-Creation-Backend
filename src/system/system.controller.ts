import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';
import { AppError, ErrorCodes } from '../common/errors';

type SeedBody = {
  /** 默认 true：只灌核心食材/菜谱，几秒内完成 */
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

  @Post('seed')
  @HttpCode(200)
  async triggerSeed(
    @Headers('x-seed-token') token: string | undefined,
    @Body() body: SeedBody = {},
  ) {
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

    // 后台执行，避免云托管 callContainer 15s 超时
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
      data: {
        status: 'started',
        minimal,
        hint: '等待 5–30 秒后 GET /api/v1/ingredients?q=番茄；或 GET /api/v1/system/seed/status',
      },
    };
  }

  @Get('seed/status')
  status(@Headers('x-seed-token') token: string | undefined) {
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
        const s = buf.toString();
        out += s;
        process.stdout.write(s);
      });
      child.stderr?.on('data', (buf: Buffer) => {
        const s = buf.toString();
        out += s;
        process.stderr.write(s);
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
