import { IsNotEmpty, IsString } from 'class-validator';

export class WechatLoginDto {
  /** `uni.login` / `wx.login` 返回的临时登录凭证 js_code */
  @IsString()
  @IsNotEmpty()
  code!: string;
}
