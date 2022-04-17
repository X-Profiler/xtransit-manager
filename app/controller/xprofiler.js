'use strict';

const Controller = require('egg').Controller;

class XprofilerController extends Controller {
  async getClient() {
    const { ctx, ctx: { service: { redis } } } = this;
    const { appId, agentId } = ctx.request.body;

    const client = await redis.getClient(appId, agentId);

    ctx.body = { ok: true, data: { client } };
  }

  async getClients() {
    const { ctx, ctx: { service: { redis } } } = this;
    const { appId } = ctx.request.body;

    const clients = await redis.getClients(appId);

    ctx.body = { ok: true, data: { clients } };
  }

  async getFiles() {
    const { ctx, ctx: { service: { redis } } } = this;
    const { appId, agentId, type, options } = ctx.request.body;

    const files = await redis.getFiles(appId, agentId, type, options);

    ctx.body = { ok: true, data: { files } };
  }

  async getErrors() {
    const { ctx, ctx: { service: { redis } } } = this;
    const { appId, agentId, errorFile, currentPage, pageSize } = ctx.request.body;

    // check file
    const files = await redis.getFiles(appId, agentId, 'error');
    if (!files.includes(errorFile)) {
      ctx.body = { ok: false, message: `file <${errorFile}> not exists on [${appId}::${agentId}]` };
      return;
    }

    // get errors
    const data = await redis.getErrors(appId, agentId, errorFile, currentPage, pageSize);

    ctx.body = { ok: true, data };
  }

  async getModules() {
    const { ctx, ctx: { service: { redis } } } = this;
    const { appId, agentId, moduleFile, options } = ctx.request.body;

    // check file
    const files = (await redis.getFiles(appId, agentId, 'package', options)).map(({ filePath }) => filePath);
    if (!files.includes(moduleFile)) {
      ctx.body = { ok: false, message: `file <${moduleFile}> not exists on [${appId}::${agentId}]` };
      return;
    }

    // get modules
    const { pkg, lock } = await redis.getModules(appId, moduleFile);
    const { dependencies = {}, devDependencies = {} } = pkg;
    const lockModule = {};
    for (const mod of Object.keys(dependencies).concat(Object.keys(devDependencies))) {
      const info = lock.dependencies[mod] || {};
      lockModule[mod] = {
        version: info.version,
        resolved: info.resolved,
      };
    }

    ctx.body = { ok: true, data: { dependencies, devDependencies, lockModule, file: moduleFile } };
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

  async checkFileStatus() {
    const { ctx, ctx: { service: { xtransit } } } = this;
    const { appId, agentId, filePath } = ctx.request.body;

    const fileStatus = await xtransit.checkFileStatus(appId, agentId, filePath);

    ctx.body = { ok: true, data: fileStatus };
  }

  async takeAction() {
    const { ctx, ctx: { service: { xtransit } } } = this;
    const { appId, agentId, pid, command, options } = ctx.request.body;

    const actionResult = await xtransit.takeAction(appId, agentId, pid, command, options);

    ctx.body = { ok: true, data: actionResult };
  }

  async transferFile() {
    const { ctx, ctx: { service: { xtransit } } } = this;
    const { appId, agentId, fileId, fileType, filePath, server, token, expiredTime } = ctx.request.body;

    const transferResponse = await xtransit.transferFile(appId, agentId, fileId, fileType, filePath, server, token, expiredTime);

    ctx.body = { ok: true, data: transferResponse };
  }
}

module.exports = XprofilerController;
