import { UserRole } from '@prisma/client';

export type JwtPayloadUser = {
  sub: string;
  username: string;
  role: UserRole;
};
