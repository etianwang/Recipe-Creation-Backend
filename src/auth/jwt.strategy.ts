import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '@prisma/client';
import { JwtPayloadUser } from './jwt-payload';

type RawPayload = {
  sub: string;
  username: string;
  role: UserRole;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-recipe-assistant-secret',
    });
  }

  validate(payload: RawPayload): JwtPayloadUser {
    return {
      sub: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}
