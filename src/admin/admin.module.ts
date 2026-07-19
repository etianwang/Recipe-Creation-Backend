import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { KnowledgeReviewService } from '../knowledge/knowledge-review.service';
import { AdminKnowledgeController } from './admin-knowledge.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminKnowledgeController],
  providers: [KnowledgeReviewService],
  exports: [KnowledgeReviewService],
})
export class AdminModule {}
