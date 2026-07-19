import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppError, ErrorCodes } from '../common/errors';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      throw err instanceof AppError
        ? err
        : new AppError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401);
    }
    return user;
  }
}
