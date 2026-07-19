import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AppError, ErrorCodes } from '../common/errors';
import { JwtPayloadUser } from '../auth/jwt-payload';
import { AiQuotaService } from './ai-quota.service';

@Injectable()
export class AiQuotaGuard implements CanActivate {
  constructor(private readonly aiQuota: AiQuotaService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: JwtPayloadUser }>();
    if (!req.user?.sub) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401);
    }
    this.aiQuota.consume(req.user.sub);
    return true;
  }
}
