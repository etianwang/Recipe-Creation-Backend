import {
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ReviewKind, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtPayloadUser } from '../auth/jwt-payload';
import { KnowledgeReviewService } from '../knowledge/knowledge-review.service';

@Controller('admin/knowledge-reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminKnowledgeController {
  constructor(private readonly reviews: KnowledgeReviewService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async list(@Query('kind') kind?: string) {
    const reviewKind =
      kind && Object.values(ReviewKind).includes(kind as ReviewKind)
        ? (kind as ReviewKind)
        : undefined;
    const data = await this.reviews.listPending(reviewKind);
    return { code: 0, message: 'ok', data };
  }

  @Post(':id/approve')
  @HttpCode(200)
  @Roles(UserRole.ADMIN)
  async approve(
    @Param('id') id: string,
    @Req() req: { user: JwtPayloadUser },
  ) {
    const result = await this.reviews.approve(id, req.user.sub);
    return {
      code: 0,
      message: 'ok',
      data: {
        id: result.review.id,
        status: result.review.status,
        recipeId: result.recipeId,
        decidedAt: result.review.decidedAt?.toISOString() ?? null,
      },
    };
  }

  @Post(':id/reject')
  @HttpCode(200)
  @Roles(UserRole.ADMIN)
  async reject(
    @Param('id') id: string,
    @Req() req: { user: JwtPayloadUser },
  ) {
    const result = await this.reviews.reject(id, req.user.sub);
    return {
      code: 0,
      message: 'ok',
      data: {
        id: result.review.id,
        status: result.review.status,
        decidedAt: result.review.decidedAt?.toISOString() ?? null,
      },
    };
  }
}
