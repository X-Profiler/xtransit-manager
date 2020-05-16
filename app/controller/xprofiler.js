'use strict';

const Controller = require('egg').Controller;

class XprofilerController extends Controller {
  async getClients() {
    const { ctx, ctx: { service: { redis } } } = this;
    const { appId } = ctx.request.body;

    const clients = await redis.getClients(appId);

    ctx.body = { ok: true, data: { clients } };
  }
}

module.exports = XprofilerController;
