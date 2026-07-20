import { AuthService } from './auth.service';
import { WechatSessionClient } from './wechat-session.client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

describe('AuthService.loginWithWechatCode', () => {
  const openid = 'ox_test_1';
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const jwt = { sign: jest.fn().mockReturnValue('jwt-token') };
  const wechat = {
    code2Session: jest.fn().mockResolvedValue({ openid }),
  };

  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt as unknown as JwtService,
    wechat as unknown as WechatSessionClient,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    wechat.code2Session.mockResolvedValue({ openid });
    jwt.sign.mockReturnValue('jwt-token');
  });

  const originalEnv = process.env.ADMIN_OPENIDS;
  afterEach(() => {
    process.env.ADMIN_OPENIDS = originalEnv;
  });

  it('creates user on first login', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'u1',
      openid,
      username: null,
      role: UserRole.USER,
      passwordHash: null,
      createdAt: new Date(),
    });

    const data = await service.loginWithWechatCode({ code: 'abc' });
    expect(wechat.code2Session).toHaveBeenCalledWith('abc');
    expect(prisma.user.create).toHaveBeenCalled();
    expect(data.accessToken).toBe('jwt-token');
    expect(data.user.openid).toBe(openid);
  });

  it('reuses existing openid user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      openid,
      username: null,
      role: UserRole.USER,
      passwordHash: null,
      createdAt: new Date(),
    });

    const data = await service.loginWithWechatCode({ code: 'abc' });
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(data.user.id).toBe('u1');
  });

  it('upgrades role when openid is in ADMIN_OPENIDS', async () => {
    process.env.ADMIN_OPENIDS = openid;
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      openid,
      username: null,
      role: UserRole.USER,
      passwordHash: null,
      createdAt: new Date(),
    });
    prisma.user.update.mockResolvedValue({
      id: 'u1',
      openid,
      username: null,
      role: UserRole.ADMIN,
      passwordHash: null,
      createdAt: new Date(),
    });

    const data = await service.loginWithWechatCode({ code: 'abc' });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { role: UserRole.ADMIN },
    });
    expect(data.user.role).toBe(UserRole.ADMIN);
  });
});
