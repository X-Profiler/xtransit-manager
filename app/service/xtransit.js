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

  async execCommand(appId, agentId, command, expiredTime = 15 * 1000, defaultValue) {
    const { ctx: { service: { redis } } } = this;
    const { server, clientId } = await redis.getClient(appId, agentId);
    if (!server) {
      const message = `app ${appId} agent ${agentId} not connected!`;
      return { ok: false, message };
    }
    const data = { appId, agentId, clientId, command, expiredTime };
    return this.request(server, '/xapi/exec_command', data, defaultValue);
  }

  closeClient(server, data) {
    return this.request(server, '/xapi/shutdown', data);
  }

  checkClientAlive(server, data) {
    data.expiredTime = 5000;
    return this.request(server, '/xapi/check_client_alive', data, {});
  }

  getAgentOsInfo(appId, agentId) {
    return this.execCommand(appId, agentId, 'get_os_info');
  }

  getAgentNodeProcesses(appId, agentId) {
    return this.execCommand(appId, agentId, 'get_node_processes');
  }

  checkProcessStatus(appId, agentId, pid) {
    return this.execCommand(appId, agentId, `check_process_status ${pid}`);
  }

  checkProcessesAlive(appId, agentId, pids) {
    return this.execCommand(appId, agentId, `check_processes_alive ${pids.join(' ')}`);
  }

  checkFileStatus(appId, agentId, filePath) {
    return this.execCommand(appId, agentId, `check_file_status ${filePath}`);
  }

  takeAction(appId, agentId, pid, command, options) {
    return this.execCommand(appId, agentId, `xprofctl ${pid} ${command} ${JSON.stringify(options)}`);
  }

  transferFile(appId, agentId, fileId, fileType, filePath, server, token, expiredTime) {
    return this.execCommand(appId, agentId, `upload_file ${fileId} ${fileType} ${filePath} ${server} ${token}`, expiredTime);
  }
}

module.exports = XtransitService;
