import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { AppError, ErrorCodes } from '../common/errors';
import { ROLES_KEY } from './roles.decorator';
import { JwtPayloadUser } from './jwt-payload';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<{ user?: JwtPayloadUser }>();
    const user = request.user;
    if (!user) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401);
    }
    if (!required.includes(user.role)) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Forbidden', 403);
    }
    return true;
  }
}
