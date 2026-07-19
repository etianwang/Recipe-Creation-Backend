import { Injectable } from '@nestjs/common';
import { AppError, ErrorCodes } from '../common/errors';

/**
 * In-memory daily AI call quota per user (MVP).
 * Replace with Redis in later ops hardening.
 */
@Injectable()
export class AiQuotaService {
  private limit: number;
  private readonly counters = new Map<string, { day: string; count: number }>();

  constructor() {
    this.limit = Number(process.env.AI_DAILY_QUOTA ?? 20);
  }

  /** Exposed for tests. */
  setLimit(limit: number) {
    this.limit = limit;
  }

  reset() {
    this.counters.clear();
  }

  private todayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  remaining(userId: string): number {
    const day = this.todayKey();
    const entry = this.counters.get(userId);
    if (!entry || entry.day !== day) return this.limit;
    return Math.max(0, this.limit - entry.count);
  }

  consume(userId: string): void {
    const day = this.todayKey();
    const entry = this.counters.get(userId);
    if (!entry || entry.day !== day) {
      this.counters.set(userId, { day, count: 1 });
      return;
    }
    if (entry.count >= this.limit) {
      throw new AppError(
        ErrorCodes.AI_QUOTA_EXCEEDED,
        'AI daily quota exceeded',
        429,
      );
    }
    entry.count += 1;
  }
}
