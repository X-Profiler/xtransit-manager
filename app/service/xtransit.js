'use strict';

const Service = require('egg').Service;

class XtransitService extends Service {
  request(host, path, data) {
    const { ctx, ctx: { app: { sign, config: { secure: { secret } } } } } = this;
    const url = `${host}${path}`;
    data.signature = sign(data, secret);
    return ctx.curl(url, {
      method: 'POST',
      data,
      nestedQuerystring: true,
      contentType: 'json',
    });
  }

  async closeClient(server, data) {
    await this.request(server, '/xapi/shutdown', data);
  }
}

module.exports = XtransitService;
