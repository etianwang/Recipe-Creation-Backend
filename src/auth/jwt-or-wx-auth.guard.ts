import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { AppError, ErrorCodes } from '../common/errors';
import { AuthService } from './auth.service';
import type { JwtPayloadUser } from './jwt-payload';

type HeaderBag = Record<string, string | string[] | undefined>;

function headerValue(headers: HeaderBag, key: string): string {
  const raw = headers[key] ?? headers[key.toLowerCase()];
  if (Array.isArray(raw)) return String(raw[0] ?? '').trim();
  return String(raw ?? '').trim();
}

/**
 * JWT Bearer 优先；缺省时接受云托管 callContainer 注入的 x-wx-openid
 *（需伴随 x-wx-appid / x-wx-env 等平台头，且 appid 与 WECHAT_APPID 一致）。
 */
@Injectable()
export class JwtOrWxAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: HeaderBag;
      user?: JwtPayloadUser;
    }>();
    const headers = req.headers ?? {};

    const auth = headerValue(headers, 'authorization');
    if (auth.toLowerCase().startsWith('bearer ')) {
      const token = auth.slice(7).trim();
      if (token) {
        try {
          const payload = this.jwtService.verify<{
            sub: string;
            username: string;
            role: UserRole;
            openid?: string;
          }>(token);
          req.user = {
            sub: payload.sub,
            username: payload.username,
            role: payload.role,
            openid: payload.openid,
          };
          return true;
        } catch {
          // fall through to wx openid
        }
      }
    }

    const openid = this.extractTrustedOpenid(headers);
    if (openid) {
      const user = await this.authService.findOrCreateByOpenid(openid);
      req.user = {
        sub: user.id,
        username: user.username || user.openid || user.id,
        role: user.role,
        openid: user.openid ?? undefined,
      };
      return true;
    }

    throw new AppError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401);
  }

  private extractTrustedOpenid(headers: HeaderBag): string | null {
    const openid = headerValue(headers, 'x-wx-openid');
    if (!openid) return null;

    const appid = headerValue(headers, 'x-wx-appid');
    const expected = process.env.WECHAT_APPID?.trim();
    if (expected && appid && appid !== expected) return null;

    const hasCloudMarker = !!(
      appid ||
      headerValue(headers, 'x-wx-env') ||
      headerValue(headers, 'x-wx-from') ||
      headerValue(headers, 'x-wx-source')
    );
    if (!hasCloudMarker) return null;

    return openid;
  }
}
