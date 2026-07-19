import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AppError, ErrorCodes } from '../common/errors';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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

    const role =
      dto.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.USER;
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: { username, passwordHash, role },
    });

    return this.tokenResponse(user.id, user.username!, user.role);
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

    return this.tokenResponse(user.id, user.username!, user.role);
  }

  private tokenResponse(id: string, username: string, role: UserRole) {
    const accessToken = this.jwtService.sign({
      sub: id,
      username,
      role,
    });
    return {
      accessToken,
      tokenType: 'Bearer',
      user: { id, username, role },
    };
  }
}
