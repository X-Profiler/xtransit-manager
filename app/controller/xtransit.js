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

  async removeClient() {
    const { ctx, ctx: { service: { redis, alarm } } } = this;
    const { appId, agentId, clientId } = ctx.request.body;

    // alarm instance offline
    const context = { appId, agentId, clientId, agentOffline: true };
    await alarm.judgeMetrics(appId, agentId, context, 'xtransit_notification');

    await redis.removeClient(appId, agentId, clientId);

    ctx.body = { ok: true };
  }

  async handleLog() {
    const { ctx, ctx: { service: { log: { xprofiler, system, error, package: pkg, core } } } } = this;
    const { appId, agentId, log: { type, data } } = ctx.request.body;

    switch (type) {
      case 'xprofiler_log':
        await xprofiler.handle(appId, agentId, data);
        break;
      case 'system_log':
        await system.handle(appId, agentId, data);
        break;
      case 'error_log':
        await error.handle(appId, agentId, data);
        break;
      case 'package':
        await pkg.handle(appId, agentId, data);
        break;
      case 'core_files':
        await core.handle(appId, agentId, data);
        break;
      default:
        break;
    }

    ctx.body = { ok: true };
  }

  async updateActionStatus() {
    const { ctx, ctx: { service: { mysql } } } = this;
    const { appId, agentId, filePath } = ctx.request.body;

    await mysql.updateFileStatusByAppAgentFile(appId, agentId, filePath);

    ctx.body = { ok: true };
  }
}

module.exports = XtransitController;
