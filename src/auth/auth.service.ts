import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AppError, ErrorCodes } from '../common/errors';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { WechatSessionClient } from './wechat-session.client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly wechatSession: WechatSessionClient,
  ) {}

  async register(dto: RegisterDto) {
    const username = dto.username.trim();
    if (!username) {
      throw new AppError(ErrorCodes.INVALID_PARAM, 'username is required', 400);
    }

    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) {
      throw new AppError(ErrorCodes.INVALID_PARAM, 'username already taken', 400);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: { username, passwordHash, role: UserRole.USER },
    });

    return this.tokenResponse(user);
  }

  async login(dto: LoginDto) {
    const username = dto.username.trim();
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user?.passwordHash) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid credentials', 401);
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid credentials', 401);
    }

    return this.tokenResponse(user);
  }

  async loginWithWechatCode(dto: WechatLoginDto) {
    let session;
    try {
      session = await this.wechatSession.code2Session(dto.code);
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      const message =
        err instanceof Error ? err.message : 'WeChat login failed';
      throw new AppError(ErrorCodes.UNAUTHORIZED, message, 401);
    }

    const openid = session.openid.trim();
    if (!openid) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'Missing openid', 401);
    }

    const adminOpenids = new Set(
      String(process.env.ADMIN_OPENIDS ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
    const desiredRole = adminOpenids.has(openid) ? UserRole.ADMIN : UserRole.USER;

    let user = await this.prisma.user.findUnique({ where: { openid } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { openid, role: desiredRole },
      });
    } else if (user.role !== desiredRole) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { role: desiredRole },
      });
    }

    return this.tokenResponse(user);
  }

  private tokenResponse(user: User) {
    const displayName = user.username || user.openid || user.id;
    const accessToken = this.jwtService.sign({
      sub: user.id,
      username: displayName,
      role: user.role,
      openid: user.openid ?? undefined,
    });
    return {
      accessToken,
      tokenType: 'Bearer' as const,
      user: {
        id: user.id,
        username: user.username,
        openid: user.openid,
        role: user.role,
      },
    };
  }
}
