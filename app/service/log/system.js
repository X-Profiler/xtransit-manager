'use strict';

const Service = require('egg').Service;

class SystemService extends Service {
  calculteHttpCode(responseCodes) {
    const { ctx } = this;
    const httpCodeMap = {
      code_4xx: 0,
      code_5xx: 0,
    };
    if (!responseCodes) {
      return httpCodeMap;
    }
    try {
      const codeMap = JSON.parse(responseCodes);
      for (const [code, count] of Object.entries(codeMap)) {
        // 4xx
        if (Number(code) >= 400 && Number(code) < 500) {
          httpCodeMap.code_4xx += Number(count);
        }

        // 5xx
        if (Number(code) >= 500 && Number(code) < 600) {
          httpCodeMap.code_5xx += Number(count);
        }
      }
    } catch (err) {
      ctx.logger.error(`calculteHttpCode failed: ${err.stack}, raw: ${responseCodes}`);
    }
    return httpCodeMap;
  }

  calculateDisks(disks) {
    const { ctx } = this;
    const list = [];
    if (!disks || typeof disks !== 'object') {
      return list;
    }
    try {
      Object.entries(disks).forEach(([disk, usage]) => {
        list.push({
          mounted_on: disk,
          disk_usage: Number(usage),
        });
      });
    } catch (err) {
      ctx.logger.error(`calculateDisks failed: ${err.stack}`);
    }
    return list;
  }

  async handle(appId, agentId, message, position = 0) {
    this.ctx.app.formatLogTime(message);

    const { ctx: { service: { mysql, alarm } } } = this;

    const tasks = [];
    tasks.push(mysql.saveSystemLog(appId, agentId, message, position));

    // check rule
    const disks = this.calculateDisks(message.disks);
    const { code_4xx, code_5xx } = this.calculteHttpCode(message.response_codes);
    const os_cpu_usage = message.used_cpu ? Number((message.used_cpu * 100).toFixed(2)) : 0;
    const os_mem_usage = message.total_memory && message.free_memory ?
      Number(((message.total_memory - message.free_memory) / message.total_memory * 100).toFixed(2)) : 0;
    const context = Object.assign({
      expired_request: message.http_request_timeout || 0,
      code_4xx, code_5xx,
      os_cpu_usage, os_mem_usage,
    }, message);
    tasks.push(alarm.judgeMetrics(appId, agentId, [context].concat(disks), 'system_log'));

    await Promise.all(tasks);
  }
}

module.exports = SystemService;
