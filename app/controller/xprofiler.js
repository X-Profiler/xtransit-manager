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

  async getAgentNodeProcesses() {
    const { ctx, ctx: { service: { xtransit } } } = this;
    const { appId, agentId } = ctx.request.body;

    const nodeProcesses = await xtransit.getAgentNodeProcesses(appId, agentId);

    ctx.body = { ok: true, data: nodeProcesses };
  }

  async checkProcessStatus() {
    const { ctx, ctx: { service: { xtransit } } } = this;
    const { appId, agentId, pid } = ctx.request.body;

    const nodeProcesses = await xtransit.checkProcessStatus(appId, agentId, pid);

    ctx.body = { ok: true, data: nodeProcesses };
  }

  async checkProcessesAlive() {
    const { ctx, ctx: { service: { xtransit } } } = this;
    const { appId, agentId, pids } = ctx.request.body;

    const processesAlive = await xtransit.checkProcessesAlive(appId, agentId, pids);

    ctx.body = { ok: true, data: processesAlive };
  }

  async takeAction() {
    const { ctx, ctx: { service: { xtransit } } } = this;
    const { appId, agentId, pid, command, options } = ctx.request.body;

    const actionResult = await xtransit.takeAction(appId, agentId, pid, command, options);

    ctx.body = { ok: true, data: actionResult };
  }
}

module.exports = XprofilerController;
