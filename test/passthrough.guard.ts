import { CanActivate } from '@nestjs/common';

/** No-op guard used to disable global Throttler in most e2e suites. */
export const passthroughGuard: CanActivate = {
  canActivate: () => true,
};
