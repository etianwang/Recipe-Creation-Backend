import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { WechatLoginDto } from './dto/wechat-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(200)
  async register(@Body() dto: RegisterDto) {
    const data = await this.authService.register(dto);
    return { code: 0, message: 'ok', data };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto);
    return { code: 0, message: 'ok', data };
  }

  /** 小程序：uni.login code → openid → JWT */
  @Post('wechat/login')
  @HttpCode(200)
  async wechatLogin(@Body() dto: WechatLoginDto) {
    const data = await this.authService.loginWithWechatCode(dto);
    return { code: 0, message: 'ok', data };
  }
}
