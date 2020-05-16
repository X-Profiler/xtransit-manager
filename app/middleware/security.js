'use strict';

module.exports = config => {
  const { secret } = config;
  return {
    async checkSign(ctx, next) {
      const { app: { sign }, method, request: { body }, query } = ctx;
      let data;
      if (method === 'GET') {
        data = query;
      } else {
        data = body;
      }
      const { signature } = data;
      if (!signature) {
        return ctx.authFailed(401, '需要签名');
      }
      delete data.signature;
      if (sign(data, secret) !== signature) {
        return ctx.authFailed(401, '签名错误');
      }
      await next();
    },
  };
};
