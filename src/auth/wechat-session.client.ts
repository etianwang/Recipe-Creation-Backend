export type WechatSessionResult = {
  openid: string;
  unionid?: string;
  sessionKey?: string;
};

/** 可替换实现，便于 e2e mock */
export abstract class WechatSessionClient {
  abstract code2Session(code: string): Promise<WechatSessionResult>;
}
