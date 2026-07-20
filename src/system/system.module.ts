import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { PurgeAiService } from './purge-ai.service';

@Module({
  controllers: [SystemController],
  providers: [PurgeAiService],
})
export class SystemModule {}
