import { Test, TestingModule } from '@nestjs/testing';
import { AiQuotaService } from './ai-quota.service';
import { ErrorCodes } from '../common/errors';

describe('AiQuotaService', () => {
  let service: AiQuotaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiQuotaService],
    }).compile();
    service = module.get(AiQuotaService);
    service.reset();
    service.setLimit(2);
  });

  it('allows until limit then throws 40002 (TR-AI-005)', () => {
    service.consume('u1');
    service.consume('u1');
    expect(() => service.consume('u1')).toThrow(
      expect.objectContaining({ code: ErrorCodes.AI_QUOTA_EXCEEDED }),
    );
  });
});
