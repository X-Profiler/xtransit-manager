'use strict';

const Controller = require('egg').Controller;

class XprofilerController extends Controller {
  async getClients() {
    const { ctx, ctx: { service: { redis } } } = this;
    const { appId } = ctx.request.body;

    const clients = await redis.getClients(appId);

    ctx.body = { ok: true, data: { clients } };
  }

  async getAgentOsInfo() {
    const { ctx, ctx: { service: { xtransit } } } = this;
    const { appId, agentId } = ctx.request.body;

    const osInfo = await xtransit.getAgentOsInfo(appId, agentId);

    ctx.body = { ok: true, data: osInfo };
  }
}

module.exports = XprofilerController;
