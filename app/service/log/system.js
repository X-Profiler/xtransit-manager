'use strict';

const Service = require('egg').Service;

class SystemService extends Service {
  async handle(appId, agentId, message, position = 0) {
    const { ctx: { service: { mysql } } } = this;

    const tasks = [];
    tasks.push(mysql.saveSystemLog(appId, agentId, message, position));

    await Promise.all(tasks);
  }
}

module.exports = SystemService;
