import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtOrWxAuthGuard } from './jwt-or-wx-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { OfficialWechatSessionClient } from './official-wechat-session.client';
import { WechatSessionClient } from './wechat-session.client';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-recipe-assistant-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtOrWxAuthGuard,
    { provide: WechatSessionClient, useClass: OfficialWechatSessionClient },
  ],
  exports: [AuthService, JwtModule, JwtOrWxAuthGuard],
})
export class AuthModule {}
