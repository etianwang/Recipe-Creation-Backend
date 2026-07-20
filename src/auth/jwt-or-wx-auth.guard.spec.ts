import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { JwtOrWxAuthGuard } from './jwt-or-wx-auth.guard';

describe('JwtOrWxAuthGuard', () => {
  const jwtService = {
    verify: jest.fn(),
  } as unknown as JwtService;
  const authService = {
    findOrCreateByOpenid: jest.fn(),
  } as unknown as AuthService;

  const guard = new JwtOrWxAuthGuard(jwtService, authService);

  function makeContext(headers: Record<string, string>) {
    const req: { headers: Record<string, string>; user?: { sub: string } } = {
      headers,
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
    return { context, req };
  }

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.WECHAT_APPID = 'wx57495d7a7fa2db41';
  });

  it('accepts valid Bearer JWT', async () => {
    (jwtService.verify as jest.Mock).mockReturnValue({
      sub: 'u1',
      username: 'a',
      role: UserRole.USER,
    });
    const { context, req } = makeContext({ authorization: 'Bearer good.token' });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(req.user?.sub).toBe('u1');
  });

  it('falls back to trusted x-wx-openid when JWT missing (TR-FAV-001)', async () => {
    (authService.findOrCreateByOpenid as jest.Mock).mockResolvedValue({
      id: 'u2',
      username: null,
      openid: 'oid-1',
      role: UserRole.USER,
    });
    const { context, req } = makeContext({
      'x-wx-openid': 'oid-1',
      'x-wx-appid': 'wx57495d7a7fa2db41',
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.findOrCreateByOpenid).toHaveBeenCalledWith('oid-1');
    expect(req.user?.sub).toBe('u2');
  });

  it('rejects when no JWT and no cloud openid', async () => {
    const { context } = makeContext({});
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      message: 'Unauthorized',
    });
  });
});
