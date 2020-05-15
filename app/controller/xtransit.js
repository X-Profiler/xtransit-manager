'use strict';

const Controller = require('egg').Controller;

class XtransitController extends Controller {
  async getAppSecret() {
    const { ctx, ctx: { service: { mysql } } } = this;
    const { appId } = ctx.request.body;

    const { secret } = await mysql.getAppByAppId(appId);

    ctx.body = { ok: true, data: { secret } };
  }

  async updateClient() {
    const { ctx, ctx: { service: { redis } } } = this;
    const { appId, agentId, clientId, server, timestamp } = ctx.request.body;

    await redis.updateClient(appId, agentId, clientId, server, timestamp);

    ctx.body = { ok: true };
  }
}

module.exports = XtransitController;
