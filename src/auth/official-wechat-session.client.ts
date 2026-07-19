import { Injectable } from '@nestjs/common';
import { AppError, ErrorCodes } from '../common/errors';
import {
  WechatSessionClient,
  WechatSessionResult,
} from './wechat-session.client';

type WechatCode2SessionResponse = {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
};

@Injectable()
export class OfficialWechatSessionClient extends WechatSessionClient {
  async code2Session(code: string): Promise<WechatSessionResult> {
    const trimmed = code.trim();
    if (!trimmed) {
      throw new AppError(ErrorCodes.INVALID_PARAM, 'code is required', 400);
    }

    // 本地/测试：允许用固定 code 跳过真实微信（不配置 SECRET 时）
    if (
      process.env.WECHAT_DEV_LOGIN === '1' &&
      trimmed.startsWith('dev:')
    ) {
      const openid = trimmed.slice(4) || 'dev-openid';
      return { openid };
    }

    const appid = process.env.WECHAT_APPID;
    const secret = process.env.WECHAT_SECRET;
    if (!appid || !secret) {
      throw new AppError(
        ErrorCodes.UNAUTHORIZED,
        'WECHAT_APPID / WECHAT_SECRET not configured',
        401,
      );
    }

    const url =
      'https://api.weixin.qq.com/sns/jscode2session' +
      `?appid=${encodeURIComponent(appid)}` +
      `&secret=${encodeURIComponent(secret)}` +
      `&js_code=${encodeURIComponent(trimmed)}` +
      '&grant_type=authorization_code';

    let data: WechatCode2SessionResponse;
    try {
      const res = await fetch(url);
      data = (await res.json()) as WechatCode2SessionResponse;
    } catch {
      throw new AppError(
        ErrorCodes.UNAUTHORIZED,
        'WeChat jscode2session network error',
        401,
      );
    }

    if (data.errcode || !data.openid) {
      throw new AppError(
        ErrorCodes.UNAUTHORIZED,
        data.errmsg || `WeChat login failed (${data.errcode ?? 'no_openid'})`,
        401,
      );
    }

    return {
      openid: data.openid,
      unionid: data.unionid,
      sessionKey: data.session_key,
    };
  }
}
