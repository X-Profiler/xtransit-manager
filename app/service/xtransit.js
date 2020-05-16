'use strict';

const Service = require('egg').Service;

class XtransitService extends Service {
  async request(host, path, data, defaultValue) {
    const { ctx, ctx: { app: { sign, config: { secure: { secret }, httpTimeout } } } } = this;
    const url = `${host}${path}`;
    data.signature = sign(data, secret);
    try {
      let { data: result } = await ctx.curl(url, {
        method: 'POST',
        data,
        nestedQuerystring: true,
        timeout: data.expiredTime || httpTimeout,
        contentType: 'json',
      });
      result = JSON.parse(result);
      if (!result.ok) {
        ctx.logger.error(`request failed: ${result.message}, url: ${url}, data: ${JSON.stringify(data)}`);
        return defaultValue;
      }
      return result.data;
    } catch (err) {
      ctx.logger.error(`request failed: ${err}, url: ${url}, data: ${JSON.stringify(data)}`);
      return defaultValue;
    }
  }

  closeClient(server, data) {
    return this.request(server, '/xapi/shutdown', data);
  }

  checkClientAlive(server, data) {
    return this.request(server, '/xapi/check_client_alive', data, {});
  }
}

module.exports = XtransitService;
